import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ConfirmProvider } from './context/ConfirmContext';
import AppRoutes from './routes/AppRoutes';

const App = () => (
  <BrowserRouter>
    <ToastProvider>
      <ConfirmProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ConfirmProvider>
    </ToastProvider>
  </BrowserRouter>
);

export default App;
