'use server'
import { createClient } from "@/utils/supabase/server";
import { errorCodeToMessage } from "@/utils/supabase/error";
import { IActionResponse } from "@/types/types";

export const signup = async (name: string, email: string, password: string): Promise<IActionResponse> => {

    const response: IActionResponse = {
        status: false,
        message: ''
    }

    try {

        const supabase = await createClient()

        const user = {
            email: email,
            password: password,
            options: {
                emailRedirectTo: `${process.env.NEXT_PUBLIC_DOMAIN}`
            }
        }
        const { data, error } = await supabase.auth.signUp(user)

        if (error) {
            const message = errorCodeToMessage(error)
            response.message = message
            throw new Error(message)
        }

        const signupUser = data?.user
        // ユーザーがすでに存在する場合
        if (signupUser?.identities?.length == 0) {
            response.message = '入力されたメールアドレスはすでに登録されています'
            throw new Error('入力されたメールアドレスはすでに登録されています')
        }

        const userData: any = {
            id: data?.user?.id,
            name: name
        }

        const { error: userError } = await supabase.from('t_user').upsert(userData)
        if (userError) {
            response.message = 'ユーザー情報の登録に失敗しました'
            throw new Error('ユーザー情報の登録に失敗しました')
        }

        response.status = true
        response.message = 'アカウントを作成しました'

    } catch (error) {
        console.log(error);
    } finally {
        return response
    }
}