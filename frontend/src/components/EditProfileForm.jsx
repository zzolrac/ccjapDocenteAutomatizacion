import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useToast } from './ui/use-toast';
import { Loader2, User, Upload, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import LoadingSpinner from './ui/LoadingSpinner';

const EditProfileForm = () => {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    foto_perfil_url: ''
  });

  // Cargar datos del usuario al montar el componente
  useEffect(() => {
    if (user) {
      setFormData({
        nombre: user.nombre || '',
        email: user.email || '',
        foto_perfil_url: user.foto_perfil_url || ''
      });
      
      if (user.foto_perfil_url) {
        setPreviewImage(user.foto_perfil_url);
      }
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Error',
        description: 'Por favor, sube un archivo de imagen válido (JPEG, PNG, etc.)',
        variant: 'destructive'
      });
      return;
    }

    // Validar tamaño del archivo (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Error',
        description: 'La imagen es demasiado grande. El tamaño máximo permitido es 5MB.',
        variant: 'destructive'
      });
      return;
    }

    // Crear vista previa de la imagen
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewImage(reader.result);
      setFormData(prev => ({
        ...prev,
        foto_perfil_url: reader.result
      }));
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setPreviewImage('');
    setFormData(prev => ({
      ...prev,
      foto_perfil_url: ''
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validar el formulario
    if (!formData.nombre.trim()) {
      toast({
        title: 'Error',
        description: 'El nombre es obligatorio',
        variant: 'destructive'
      });
      return;
    }
    
    if (!formData.email.trim()) {
      toast({
        title: 'Error',
        description: 'El correo electrónico es obligatorio',
        variant: 'destructive'
      });
      return;
    }
    
    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        title: 'Error',
        description: 'Por favor ingresa un correo electrónico válido',
        variant: 'destructive'
      });
      return;
    }
    
    setIsLoading(true);
    setIsSubmitting(true);

    try {
      // Crear FormData para manejar la carga de archivos
      const formDataToSend = new FormData();
      
      // Agregar campos al FormData
      formDataToSend.append('nombre', formData.nombre);
      formDataToSend.append('email', formData.email);
      
      // Si hay una nueva imagen, agregarla al FormData
      if (previewImage && previewImage !== user.foto_perfil_url) {
        // Si previewImage es una URL de datos, ya es una cadena base64
        if (previewImage.startsWith('data:image')) {
          // Convertir la URL de datos a un blob
          const blob = await fetch(previewImage).then(res => res.blob());
          formDataToSend.append('foto_perfil', blob, 'profile.jpg');
        }
      } else if (!previewImage && user.foto_perfil_url) {
        // Si se eliminó la imagen
        formDataToSend.append('removeImage', 'true');
      }
      
      const response = await fetch('/api/users/me', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formDataToSend
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al actualizar el perfil');
      }

      // Actualizar el contexto de autenticación
      await updateUser(data);

      toast({
        title: '¡Perfil actualizado!',
        description: 'Tu perfil se ha actualizado correctamente.'
      });
    } catch (error) {
      console.error('Error al actualizar el perfil:', error);
      
      // Manejar diferentes tipos de errores
      let errorMessage = 'Error al actualizar el perfil';
      
      if (error.message.includes('NetworkError')) {
        errorMessage = 'Error de conexión. Por favor, verifica tu conexión a internet.';
      } else if (error.message.includes('email_unique')) {
        errorMessage = 'Este correo electrónico ya está en uso. Por favor, utiliza otro.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Editar perfil</CardTitle>
        <CardDescription>
          Actualiza tu información personal y tu foto de perfil.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="foto_perfil">Foto de perfil</Label>
            <div className="flex items-center space-x-4">
              <div className="relative">
                {previewImage ? (
                  <div className="relative">
                    <img 
                      src={previewImage} 
                      alt="Vista previa" 
                      className="h-24 w-24 rounded-full object-cover border-2 border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="h-24 w-24 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="h-12 w-12 text-gray-400" />
                  </div>
                )}
              </div>
              <div>
                <Label 
                  htmlFor="foto_perfil" 
                  className="cursor-pointer inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {previewImage ? 'Cambiar imagen' : 'Subir imagen'}
                </Label>
                <Input 
                  id="foto_perfil"
                  name="foto_perfil"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
                <p className="mt-1 text-xs text-gray-500">
                  PNG, JPG o GIF (máx. 5MB)
                </p>
              </div>
            </div>
          </div>


          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre completo</Label>
            <Input
              id="nombre"
              name="nombre"
              type="text"
              value={formData.nombre}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                // Restablecer el formulario a los valores originales
                if (user) {
                  setFormData({
                    nombre: user.nombre || '',
                    email: user.email || '',
                    foto_perfil_url: user.foto_perfil_url || ''
                  });
                  setPreviewImage(user.foto_perfil_url || '');
                }
              }}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="min-w-[120px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : 'Guardar cambios'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default EditProfileForm;
