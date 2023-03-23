export type Address = string
export type ByteCode = string
type ABIEntry = {
    name: string
    type: 'event' | 'function'
    inputs: {name: string; type: 'string'; indexed: boolean}[]
    outputs: {name: string; type: 'string'}[] | undefined
}

export type IABI = ABIEntry[]
