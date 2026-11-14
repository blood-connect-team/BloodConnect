#!/usr/bin/env bash
# Blood Connect: one-time GitHub repository setup for repository/organization ADMINS.
# Steps: labels, milestones, repository merge settings, security features,
# GitHub Project (board + custom fields), and main-branch protection.
#
# SAFE BY DEFAULT: without --apply it only PRINTS what it would change (dry run).
# Run --apply only after the team has approved the plan in docs/DEVOPS.md.
#
# Usage:  scripts/setup-github.sh [--apply] <step>...
# Steps:  labels | milestones | repo-settings | security | project | rulesets | branch-protection
#         all  (= labels milestones repo-settings security project; NOT rulesets/branch-protection)
#         rulesets: recommended protection for main (checks for all; review bypass for org owners)
# Env:    REPO=owner/name (default below), REQUIRED_CHECKS="ci" (space-separated),
#         PROJECT_OWNER=<user> (account that owns the Project; default: repo owner)
# Needs:  GitHub CLI (gh auth login): triage/write for labels+milestones, admin for settings steps;
#         the project step also needs: gh auth refresh -s project
set -euo pipefail

REPO="${REPO:-blood-connect-team/BloodConnect}"
OWNER="${REPO%%/*}"
# Owner of the GitHub Project (default: repo owner). A collaborator without access to the
# owner account can host the board on their own account: PROJECT_OWNER=<their-username>.
PROJECT_OWNER="${PROJECT_OWNER:-$OWNER}"
REQUIRED_CHECKS="${REQUIRED_CHECKS:-ci}"
APPLY=false
STEPS=()

usage() { sed -n '2,15p' "$0"; }

for arg in "$@"; do
  case "$arg" in
    --apply) APPLY=true ;;
    -h|--help) usage; exit 0 ;;
    all) STEPS+=(labels milestones repo-settings security project) ;;
    labels|milestones|repo-settings|security|project|branch-protection|rulesets) STEPS+=("$arg") ;;
    *) echo "Unknown argument: $arg"; usage; exit 1 ;;
  esac
done
if [ ${#STEPS[@]} -eq 0 ]; then usage; exit 1; fi

# Run a command, or print it in dry-run mode.
run() {
  if $APPLY; then "$@"; else printf '[dry-run]'; printf ' %q' "$@"; printf '\n'; fi
}

# Run a gh command that takes a JSON body on stdin, or print both in dry-run mode.
run_json() {
  local json="$1"; shift
  if $APPLY; then
    printf '%s' "$json" | gh "$@" --input -
  else
    printf '[dry-run] gh'; printf ' %q' "$@"; printf ' --input - <<JSON\n%s\nJSON\n' "$json"
  fi
}

require_gh() {
  command -v gh >/dev/null 2>&1 || { echo "GitHub CLI (gh) is not installed: https://cli.github.com/"; exit 1; }
  gh auth status >/dev/null 2>&1 || { echo "Not logged in. Run: gh auth login"; exit 1; }
}

# Check the permission a step needs before applying it:
# labels/milestones need triage (or write); repo settings, security and branch protection need admin.
require_perm() {
  $APPLY || return 0
  local level="$1" ok
  ok="$(gh api "repos/$REPO" --jq ".permissions.$level")"
  [ "$ok" = "true" ] || { echo "'$level' permission on $REPO is required for this step (ask the repository owner)."; exit 1; }
}

# name|colour|description  (catalogue: BLOOD_CONNECT_PRODUCT_BLUEPRINT.md, Appendix 6)
LABELS='type:bug|d73a4a|Something is broken
type:feature|0e8a16|New user-facing capability
type:improvement|84b6eb|Better version of an existing capability
type:security|b60205|Security or privacy fix
type:tech-debt|fbca04|Internal quality, refactor, architecture
type:docs|0075ca|Documentation
type:testing|bfd4f2|Tests and test tooling
type:chore|cfd3d7|Tooling, config, dependencies
area:auth|1d76db|Sign-up, login, sessions, roles
area:db|1d76db|Schema, migrations, RLS, SQL functions
area:donor|1d76db|Donor-facing screens and data
area:requests|1d76db|Blood requests and their lifecycle
area:matching|1d76db|Donor/request matching
area:notifications|1d76db|Email, in-app, WhatsApp links
area:admin|1d76db|Admin console and moderation
area:trust|1d76db|Abuse prevention, verification, safety
area:ui|1d76db|Layout, components, responsiveness, a11y
area:infra|1d76db|CI, hosting, environments, repo settings
needs-triage|ededed|New; fields and Definition of Ready not yet checked
needs-decision|5319e7|Waiting on a team decision
blocked|000000|Cannot proceed (see Blocked by)
launch-blocker|b60205|Must be done before public launch
security-review|e99695|Requires 2 approvals incl. a code owner
good first issue|7057ff|Small, well-scoped, good for learning
help wanted|008672|Released or looking for a taker
interim|f9d0c4|Temporary fix superseded by a later issue
from-audit|c5def5|Originates from the product audit
dependencies|0366d6|Dependency updates (Dependabot)'

MILESTONES=(
  "M0.1 Decisions & repo safety"
  "M0.2 Honest & safe UI"
  "M0.3 Supabase foundation"
  "M0.4 Real identity"
  "M1.1 Donor flows"
  "M1.2 Request flows"
  "M1.3 Response loop & alerts"
  "M1.4 Beta readiness"
  "M2.1 Tracking & communication"
  "M2.2 Trust & admin"
  "M2.3 Donor experience"
  "M3.1 Engagement"
  "M3.2 Community pilot"
  "M3.3 Scale & quality"
  "M3.4 Platform review"
)

step_labels() {
  echo "== Labels (create missing, update colour/description of existing; never duplicates)"
  local existing name color desc action
  existing="$(gh label list --repo "$REPO" --limit 500 --json name --jq '.[].name')"
  while IFS='|' read -r name color desc; do
    [ -z "$name" ] && continue
    if grep -Fxq -- "$name" <<<"$existing"; then action=update; else action=create; fi
    echo "label ($action): $name"
    run gh label create "$name" --repo "$REPO" --color "$color" --description "$desc" --force
  done <<<"$LABELS"
}

step_milestones() {
  echo "== Milestones (create missing only)"
  local existing m
  existing="$(gh api "repos/$REPO/milestones?state=all&per_page=100" --jq '.[].title')"
  for m in "${MILESTONES[@]}"; do
    if grep -Fxq -- "$m" <<<"$existing"; then echo "milestone exists, skipped: $m"; continue; fi
    run gh api -X POST "repos/$REPO/milestones" -f "title=$m" --silent
  done
}

step_repo_settings() {
  echo "== Merge settings: squash only, PR title as commit title, auto-delete merged branches"
  run gh api -X PATCH "repos/$REPO" --silent \
    -F allow_squash_merge=true -F allow_merge_commit=false -F allow_rebase_merge=false \
    -F delete_branch_on_merge=true -F allow_update_branch=true \
    -f squash_merge_commit_title=PR_TITLE -f squash_merge_commit_message=PR_BODY
}

step_security() {
  echo "== Security features"
  run gh api -X PUT "repos/$REPO/vulnerability-alerts" --silent        # Dependabot alerts
  run gh api -X PUT "repos/$REPO/automated-security-fixes" --silent    # Dependabot security update PRs
  local vis
  vis="$(gh api "repos/$REPO" --jq .visibility)"
  if [ "$vis" = "public" ]; then
    echo "Repository is public: enabling free private vulnerability reporting, secret scanning and push protection."
    run gh api -X PUT "repos/$REPO/private-vulnerability-reporting" --silent
    run_json '{"security_and_analysis":{"secret_scanning":{"status":"enabled"},"secret_scanning_push_protection":{"status":"enabled"}}}' \
      api -X PATCH "repos/$REPO" --silent
  else
    echo "Repository is $vis: GitHub's own secret scanning is a paid feature for private repos; the Gitleaks workflow covers PRs."
  fi
}

step_project() {
  echo "== GitHub Project 'Blood Connect' (no duplicate if it already exists)"
  local title="Blood Connect" num existing
  num="$(gh project list --owner "$PROJECT_OWNER" --limit 100 --format json --jq ".projects[] | select(.title==\"$title\") | .number" | head -n1)"
  if [ -z "$num" ]; then
    if ! $APPLY; then
      run gh project create --owner "$PROJECT_OWNER" --title "$title"
      echo "[dry-run] then add fields Priority, Size, Workstream, Phase, Blocked by, and link the project to $REPO"
      return
    fi
    num="$(gh project create --owner "$PROJECT_OWNER" --title "$title" --format json --jq .number)"
    echo "created project #$num"
  else
    echo "project exists: #$num"
  fi
  existing="$(gh project field-list "$num" --owner "$PROJECT_OWNER" --limit 100 --format json --jq '.fields[].name')"
  add_field() {
    local name="$1"; shift
    if grep -Fxq -- "$name" <<<"$existing"; then echo "field exists, skipped: $name"
    else run gh project field-create "$num" --owner "$PROJECT_OWNER" --name "$name" "$@"; fi
  }
  add_field "Priority"   --data-type SINGLE_SELECT --single-select-options "P0,P1,P2,P3"
  add_field "Size"       --data-type SINGLE_SELECT --single-select-options "XS,S,M,L,XL"
  add_field "Workstream" --data-type SINGLE_SELECT --single-select-options "A,B,C,D"
  add_field "Phase"      --data-type SINGLE_SELECT --single-select-options "0,1,2,3"
  add_field "Blocked by" --data-type TEXT
  run gh project link "$num" --owner "$PROJECT_OWNER" --repo "$REPO" \
    || echo "note: project not linked to $REPO (only possible when both have the same owner); issues can still be added."
  # Replace the default Status options (Todo/In Progress/Done) with the team's seven statuses.
  local status_id
  status_id="$(gh project field-list "$num" --owner "$PROJECT_OWNER" --limit 100 --format json --jq '.fields[] | select(.name=="Status") | .id')"
  run gh api graphql -f "f=$status_id" -f query='mutation($f:ID!){ updateProjectV2Field(input:{fieldId:$f, singleSelectOptions:[
    {name:"Backlog",color:GRAY,description:"Captured, not yet actionable"},
    {name:"Ready",color:BLUE,description:"Meets Definition of Ready; free to claim"},
    {name:"In Progress",color:YELLOW,description:"Assigned and being implemented"},
    {name:"In Review",color:PURPLE,description:"PR open, waiting for review"},
    {name:"Changes Requested",color:ORANGE,description:"Review feedback to address"},
    {name:"Blocked",color:RED,description:"Waiting on a blocker (see Blocked by)"},
    {name:"Done",color:GREEN,description:"Merged and verified"}]}){ projectV2Field { ... on ProjectV2SingleSelectField { id } } } }' --silent
  echo "Manual steps in the web UI (no CLI support): views and built-in workflows."
  echo "See docs/DEVOPS.md, section 'GitHub Project'."
}

step_branch_protection() {
  echo "== Branch protection for main"
  local vis checks="" c json
  vis="$(gh api "repos/$REPO" --jq .visibility)"
  if [ "$vis" != "public" ]; then
    echo "NOTE: $REPO is $vis. Private repos need a paid plan for branch protection (free orgs: GitHub Team;"
    echo "      personal accounts: Pro, free via the Student Developer Pack). A 403 means protection is NOT active."
  fi
  for c in $REQUIRED_CHECKS; do checks="${checks:+$checks,}{\"context\":\"$c\"}"; done
  json="{
  \"required_status_checks\": {\"strict\": false, \"checks\": [$checks]},
  \"enforce_admins\": true,
  \"required_pull_request_reviews\": {
    \"dismiss_stale_reviews\": true,
    \"require_code_owner_reviews\": true,
    \"required_approving_review_count\": 1
  },
  \"restrictions\": null,
  \"required_conversation_resolution\": true,
  \"allow_force_pushes\": false,
  \"allow_deletions\": false
}"
  run_json "$json" api -X PUT "repos/$REPO/branches/main/protection" --silent
}

# Rulesets for main (recommended instead of classic branch protection):
#  1) "main: required checks"  - status checks, no force push, no deletion. Nobody can bypass.
#  2) "main: release review"   - PR + approval from a code owner (release owners in CODEOWNERS).
#     Organization owners may bypass it when merging a PR (bypass_mode "pull_request"),
#     so release owners can merge their own PRs once checks pass. No direct pushes for anyone.
upsert_ruleset() {
  local name="$1" json="$2" id
  id="$(gh api "repos/$REPO/rulesets" --jq ".[] | select(.name==\"$name\") | .id" | head -n1)"
  if [ -n "$id" ]; then
    echo "ruleset exists, updating: $name (#$id)"
    run_json "$json" api -X PUT "repos/$REPO/rulesets/$id" --silent
  else
    echo "ruleset create: $name"
    run_json "$json" api -X POST "repos/$REPO/rulesets" --silent
  fi
}

step_rulesets() {
  echo "== Rulesets for main"
  local checks="" c
  for c in $REQUIRED_CHECKS; do checks="${checks:+$checks,}{\"context\":\"$c\"}"; done
  upsert_ruleset "main: required checks" "{
  \"name\": \"main: required checks\",
  \"target\": \"branch\",
  \"enforcement\": \"active\",
  \"conditions\": {\"ref_name\": {\"include\": [\"~DEFAULT_BRANCH\"], \"exclude\": []}},
  \"bypass_actors\": [],
  \"rules\": [
    {\"type\": \"deletion\"},
    {\"type\": \"non_fast_forward\"},
    {\"type\": \"required_status_checks\", \"parameters\": {
      \"strict_required_status_checks_policy\": false,
      \"required_status_checks\": [$checks]}}
  ]
}"
  upsert_ruleset "main: release review" "{
  \"name\": \"main: release review\",
  \"target\": \"branch\",
  \"enforcement\": \"active\",
  \"conditions\": {\"ref_name\": {\"include\": [\"~DEFAULT_BRANCH\"], \"exclude\": []}},
  \"bypass_actors\": [{\"actor_id\": 1, \"actor_type\": \"OrganizationAdmin\", \"bypass_mode\": \"pull_request\"}],
  \"rules\": [
    {\"type\": \"pull_request\", \"parameters\": {
      \"required_approving_review_count\": 1,
      \"require_code_owner_review\": true,
      \"dismiss_stale_reviews_on_push\": true,
      \"require_last_push_approval\": false,
      \"required_review_thread_resolution\": true}}
  ]
}"
}

require_gh
$APPLY && echo "MODE: APPLY (changes will be made to $REPO)" || echo "MODE: DRY RUN (nothing will change). Add --apply to make changes."
for s in "${STEPS[@]}"; do
  case "$s" in
    labels) require_perm triage; step_labels ;;
    milestones) require_perm triage; step_milestones ;;
    repo-settings) require_perm admin; step_repo_settings ;;
    security) require_perm admin; step_security ;;
    project) step_project ;;
    branch-protection) require_perm admin; step_branch_protection ;;
    rulesets) require_perm admin; step_rulesets ;;
  esac
done
