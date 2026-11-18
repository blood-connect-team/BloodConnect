import { Link } from 'react-router-dom';
import { Button } from '../../components/common/Button';

export default function NotFound() {
  return (
    <section className="mx-auto flex max-w-xl flex-col items-center px-4 py-20 text-center">
      <p className="text-sm font-bold uppercase tracking-wide text-brand-red">Error 404</p>
      <h1 className="mt-2 text-3xl font-bold text-gray-900">Page not found</h1>
      <p className="mt-3 text-gray-600">We could not find the page you were looking for. It may have moved, or the link may be wrong.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/"><Button>Home</Button></Link>
        <Link to="/register"><Button variant="outline">Register as a donor</Button></Link>
        <Link to="/request"><Button variant="outline">Request blood</Button></Link>
      </div>
    </section>
  );
}
