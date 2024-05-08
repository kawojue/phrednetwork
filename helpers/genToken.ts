import { createHmac } from 'crypto'

export function genToken(userId: string, randomCode: string) {
    const token = createHmac('sha256', process.env.ENCRYPTION_KEY)
        .update(`${userId}-${randomCode}`)
        .digest('hex')

    const currentDate = new Date()
    const token_expiry = new Date(
        currentDate.setMinutes(currentDate.getMinutes() + 30)
    )

    return { token, token_expiry }
}