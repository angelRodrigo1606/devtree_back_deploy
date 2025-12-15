import { Router } from 'express'
import { body } from 'express-validator'
import { createAccount, getUser, getUserByHandle, login, searchByHandle, updateProfile, uploadImage, registerProfileView, getMyProfileViews } from './handlers'
import { param } from 'express-validator'
import { handleInputErrors } from './middleware/validation'
import { authenticate } from './middleware/auth'
import { getPublicProfiles } from './handlers'


const router = Router()

/** Autenticacion y Registro */
router.post('/auth/register',
    body('handle')
        .notEmpty()
        .withMessage('El handle no puede ir vacio'),
    body('name')
        .notEmpty()
        .withMessage('El Nombre no puede ir vacio'),
    body('email')
        .isEmail()
        .withMessage('E-mail no válido'),
    body('password')
        .isLength({ min: 8 })
        .withMessage('El Password es muy corto, mínimo 8 caracteres'),
    handleInputErrors,
    createAccount
)

router.post('/auth/login',
    body('email')
        .isEmail()
        .withMessage('E-mail no válido'),
    body('password')
        .notEmpty()
        .withMessage('El Password es obligatorio'),
    handleInputErrors,
    login
)

router.get('/user', authenticate, getUser)

router.patch('/user',
    body('handle')
        .notEmpty()
        .withMessage('El handle no puede ir vacio'),
    handleInputErrors,
    authenticate,
    updateProfile
)

router.post('/user/image', authenticate, uploadImage)

// Visitas: registrar visita al perfil público
router.post('/:handle/view',
  param('handle').notEmpty().withMessage('El handle no puede ir vacío'),
  handleInputErrors,
  registerProfileView
)

// Visitas: ver mis visitas (seguro con JWT)
router.get('/user/views', authenticate, getMyProfileViews)

router.get('/profiles', getPublicProfiles)


router.get('/:handle', getUserByHandle)

router.post('/search',
    body('handle')
        .notEmpty()
        .withMessage('El handle no puede ir vacio'),
    handleInputErrors,
    searchByHandle
)

export default router