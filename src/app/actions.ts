'use server';
import { createClient } from "@/utils/supabase/server";
import { errorCodeToMessage } from "@/utils/supabase/error";
import { IActionResponse } from "@/types/types";

export const login = async (email: string, password: string): Promise<IActionResponse> => {

    const response: IActionResponse = {
        status: false,
        message: ''
    }

    try {
        const supabase = await createClient()

        const loginData = {
            email: email,
            password: password
        }
        const { error } = await supabase.auth.signInWithPassword(loginData);

        if (error) {
            if (error.code === 'email_not_confirmed') {
                response.message = 'メールアドレスの認証が完了していません。認証メールを再送信しますか？';
                throw new Error(response.message);
            }
            const message = errorCodeToMessage(error);
            response.message = message;
            throw new Error(message);
        }
        response.status = true;
    } catch (error) {
        console.log(error);
    }finally{
        return response;
    }

}