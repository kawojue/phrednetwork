import { randomBytes } from 'crypto'

export const genFileName = () => {
    return `Phred_${randomBytes(2).toString('hex')}_${new Date().toDateString().split(" ").join('-')}`
}