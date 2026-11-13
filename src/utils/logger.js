const isDevelopment = import.meta.env.DEV


export default function log(...arugs) {
    if (isDevelopment) {
        console.log(...arugs)
    }
}

