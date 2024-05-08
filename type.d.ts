type UserStatus = 'Active' | 'Suspended'
type Roles = 'user' | 'admin' | 'auditor'

interface ExpressUser extends Express.User {
    sub: string
    role: Roles
    username: string
}

interface IRequest extends Request {
    user: ExpressUser
}

interface JwtPayload {
    sub: string
    role: Roles
    username?: string
    userStatus?: UserStatus
}

interface CloudinaryModuleOptions {
    cloudName: string
    apiKey: string
    apiSecret: string
}

interface FileDest {
    folder: string
    resource_type: 'image' | 'video'
}

interface Attachment {
    public_id: string
    public_url: string
    secure_url: string
}