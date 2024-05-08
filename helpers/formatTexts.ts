import { MemebershipDuration } from '@prisma/client'

export const titleName = (fullname: string) => {
    let titledName = []
    const names = fullname.trim().split(" ")

    for (const f_name of names) {
        const formattedName = f_name[0].toUpperCase() + f_name.slice(1).toLowerCase()
        titledName.push(formattedName)
    }

    return titledName.join(" ")
}

export const formatNumber = (n: number): string => {
    if (!Number(n)) {
        return "0"
    }

    const k = 1_000 as const
    const m = 1_000_000 as const

    if (n >= m) {
        return (n / m).toFixed(1) + 'M'
    } else if (n >= k) {
        return (n / k).toFixed(1) + 'K'
    } else {
        return n.toString()
    }
}

export const formatMembership = (duration: MemebershipDuration) => {
    switch (duration) {
        case 'Monthly':
            return 1
        case 'Quaterly':
            return 3
        case 'SemiAnnual':
            return 6
        case 'Yearly':
            return 12
        default:
            return 0
    }
}

export const formatMembershipAmount = (duration: MemebershipDuration) => {
    switch (duration) {
        case 'Monthly':
            return 1200
        case 'Quaterly':
            return 3200
        case 'SemiAnnual':
            return 6200
        case 'Yearly':
            return 12200
        default:
            return 0
    }
}