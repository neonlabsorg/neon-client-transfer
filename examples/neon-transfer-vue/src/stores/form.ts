import { defineStore } from "pinia"

import { supportedTokens } from "@/utils"

interface IFormStore {
    currentToken: string,
    tokensList: string[]
}

export const useFormStore = defineStore('form', {
    state: (): IFormStore => ({
        currentToken: '',
        tokensList: supportedTokens
    }), 
    actions: {
        setCurrentToken(token: string) {
            this.currentToken = token
        }
    }
})