import { useEffect } from 'react';
import { Link, useRouteError } from 'react-router-dom';
import { Button } from '../../components/common/Button';
import { Logo } from '../../components/common/Logo';

/** Friendly screen for unexpected errors. Details are logged in development only, never shown. */
export default function ErrorPage() {
  const error = useRouteError();

  useEffect(() => {
    if (import.meta.env.DEV) console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <Link to="/" aria-label="Blood Connect home"><Logo variant="compact" /></Link>
      <h1 className="mt-8 text-3xl font-bold text-gray-900">Something went wrong</h1>
      <p className="mt-3 max-w-md text-gray-600">An unexpected error happened. Reloading the page usually fixes it.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button onClick={() => window.location.reload()}>Reload</Button>
        <a href="/"><Button variant="outline">Go to Home</Button></a>
      </div>
    </div>
  );
}
