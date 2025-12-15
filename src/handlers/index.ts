import type { Request, Response } from 'express'
import { validationResult } from 'express-validator'
import slug from 'slug'
import formidable from 'formidable'
import { v4 as uuid } from 'uuid'
import User from "../models/User"
import { checkPassword, hashPassword } from '../utils/auth'
import { generateJWT } from '../utils/jwt'
import cloudinary from '../config/cloudinary'
import crypto from "crypto";
import ProfileView from "../models/ProfileView";


export const createAccount = async (req: Request, res: Response) => {
    const { email, password } = req.body
    const userExists = await User.findOne({ email })
    if (userExists) {
        const error = new Error('Un usuario con ese mail ya esta registrado')
        return res.status(409).json({ error: error.message })
    }

    const handle = slug(req.body.handle, '')
    const handleExists = await User.findOne({ handle })
    if (handleExists) {
        const error = new Error('Nombre de usuario no disponible')
        return res.status(409).json({ error: error.message })
    }

    const user = new User(req.body)
    user.password = await hashPassword(password)
    user.handle = handle

    await user.save()
    res.status(201).send('Registro Creado Correctamente')
}

export const login = async (req: Request, res: Response) => {

    // Manejar errores
    let errors = validationResult(req)
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
    }

    const { email, password } = req.body

    // Revisar si el usuario esta registrado
    const user = await User.findOne({ email })
    if (!user) {
        const error = new Error('El Usuario no existe')
        return res.status(404).json({ error: error.message })
    }

    // Comprobar el password
    const isPasswordCorrect = await checkPassword(password, user.password)
    if (!isPasswordCorrect) {
        const error = new Error('Password Incorrecto')
        return res.status(401).json({ error: error.message })
    }

    const token = generateJWT({ id: user._id })

    res.send(token)
}

export const getUser = async (req: Request, res: Response) => {
    res.json(req.user)
}

export const updateProfile = async (req: Request, res: Response) => {
    try {
        const { description, links } = req.body

        const handle = slug(req.body.handle, '')
        const handleExists = await User.findOne({ handle })
        if (handleExists && handleExists.email !== req.user.email) {
            const error = new Error('Nombre de usuario no disponible')
            return res.status(409).json({ error: error.message })
        }

        // Actualizar el usuario
        req.user.description = description
        req.user.handle = handle
        req.user.links = links
        await req.user.save()
        res.send('Perfil Actualizado Correctamente')

    } catch (e) {
        const error = new Error('Hubo un error')
        return res.status(500).json({ error: error.message })
    }
}

export const uploadImage = async (req: Request, res: Response) => {
    const form = formidable({ multiples: false })
    try {
        form.parse(req, (error, fields, files) => {
            cloudinary.uploader.upload(files.file[0].filepath, { public_id: uuid() }, async function (error, result) {
                if (error) {
                    const error = new Error('Hubo un error al subir la imagen')
                    return res.status(500).json({ error: error.message })
                }
                if (result) {
                    req.user.image = result.secure_url
                    await req.user.save()
                    res.json({ image: result.secure_url })
                }
            })
        })
    } catch (e) {
        const error = new Error('Hubo un error')
        return res.status(500).json({ error: error.message })
    }
}

export const getUserByHandle = async (req: Request, res: Response) => {
    try {
        const { handle } = req.params
        const user = await User.findOne({ handle }).select('-_id -__v -email -password')
        if (!user) {
            const error = new Error('El Usuario no existe')
            return res.status(404).json({ error: error.message })
        }
        res.json(user)
    } catch (e) {
        const error = new Error('Hubo un error')
        return res.status(500).json({ error: error.message })
    }
}

export const searchByHandle = async (req: Request, res: Response) => {
    try {
        const { handle } = req.body
        const userExists = await User.findOne({handle})
        if(userExists) {
            const error = new Error(`${handle} ya está registrado`)
            return res.status(409).json({error: error.message})
        }
        res.send(`${handle} está disponible`)
    } catch (e) {
        const error = new Error('Hubo un error')
        return res.status(500).json({ error: error.message })
    }
}

const getDayKey = () => new Date().toISOString().slice(0, 10); // YYYY-MM-DD

const getFingerprint = (req: Request) => {
  const ip = req.ip || req.socket.remoteAddress || "unknown-ip";
  const ua = req.headers["user-agent"] || "unknown-ua";
  return crypto.createHash("sha256").update(`${ip}|${ua}`).digest("hex");
};

/**
 * POST /:handle/view
 * Registra una visita al perfil público (1 por fingerprint por día).
 * No requiere auth (porque cualquiera puede visitar).
 */
export const registerProfileView = async (req: Request, res: Response) => {
  try {
    const { handle } = req.params;

    const user = await User.findOne({ handle });
    if (!user) {
      const error = new Error("El Usuario no existe");
      return res.status(404).json({ error: error.message });
    }

    // Si el dueño está logueado y visita su propio perfil, no contar
    if (req.user && String(req.user._id) === String(user._id)) {
      return res.status(200).json({ counted: false, message: "Self visit ignored" });
    }

    const fingerprint = getFingerprint(req);
    const day = getDayKey();

    // upsert evita duplicado + no revienta con el unique index
    const result = await ProfileView.updateOne(
      { profile: user._id, fingerprint, day },
      { $setOnInsert: { profile: user._id, fingerprint, day } },
      { upsert: true }
    );

    const counted = Boolean((result as any).upsertedCount);
    return res.status(201).json({ counted });
  } catch (e) {
    return res.status(500).json({ error: "Hubo un error" });
  }
};

/**
 * GET /user/views
 * Retorna el total de visitas del usuario autenticado.
 */
export const getMyProfileViews = async (req: Request, res: Response) => {
  try {
    const views = await ProfileView.countDocuments({ profile: req.user._id });
    return res.json({ views });
  } catch (e) {
    return res.status(500).json({ error: "Hubo un error" });
  }
};

export const getPublicProfiles = async (req: Request, res: Response) => {
  try {
    const users = await User.find()
      .select("handle name description image") // solo público
      .sort({ _id: -1 });

    res.json(users);
  } catch (e) {
    res.status(500).json({ error: "Hubo un error" });
  }
};

