export const genRandomCode = (): string => {
    function randomString(length: number): string {
        let result = ''
        let characters = ''

        const startCharCode: number = 'a'.charCodeAt(0)
        const endCharCode: number = 'z'.charCodeAt(0)

        for (let i = startCharCode; i <= endCharCode; i++) {
            characters += String.fromCharCode(i)
        }

        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length))
        }
        return result
    }

    return `${randomString(2)}-${randomString(3)}-${Date.now()}`
}