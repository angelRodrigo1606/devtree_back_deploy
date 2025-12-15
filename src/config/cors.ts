import { CorsOptions } from 'cors'

export const corsConfig : CorsOptions = {
    // Esto permite cualquier origen (*)
    origin: '*', 
    // Puedes añadir otras opciones si las necesitas, por ejemplo:
    // methods: ['GET', 'POST', 'PUT', 'DELETE'],
    // credentials: true
}