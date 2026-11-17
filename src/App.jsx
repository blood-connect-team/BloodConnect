import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { router } from './app/router';
import { AuthProvider } from './app/providers/AuthProvider';

function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            theme: {
              primary: '#10B981',
              secondary: 'black',
            },
          },
        }}
      />
    </AuthProvider>
  );
}

export default App;
