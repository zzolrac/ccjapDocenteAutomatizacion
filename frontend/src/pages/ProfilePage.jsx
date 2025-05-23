import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import EditProfileForm from '../components/EditProfileForm';
import { useAuth } from '../context/AuthContext';

const ProfilePage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Acceso no autorizado</CardTitle>
            <CardDescription>Debes iniciar sesión para ver esta página.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => navigate('/login')}>Ir al inicio de sesión</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Mi Perfil</h1>
            <p className="text-muted-foreground">
              Actualiza tu información personal y preferencias
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate(-1)}>
            Volver
          </Button>
        </div>
        
        <div className="grid gap-6">
          <EditProfileForm />
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Información de la cuenta</CardTitle>
              <CardDescription>
                Detalles de tu cuenta y configuración de privacidad.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Rol</p>
                  <p className="capitalize">{currentUser.rol?.toLowerCase()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Miembro desde</p>
                  <p>{new Date(currentUser.fecha_creacion).toLocaleDateString()}</p>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <h3 className="font-medium mb-2">Seguridad</h3>
                <Button variant="outline" onClick={() => navigate('/change-password')}>
                  Cambiar contraseña
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
