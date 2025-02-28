import { Database } from "@/types/supabasetype"
import { createClient } from "@/utils/supabase/client";
import { IActionResponse } from "@/types/types";

export const getRoomMemberAction = async (roomId:string) => {

    const response: IActionResponse = {
        status: false,
        message: '',
        data: null
    }

    try {
        const supabase = await createClient();
        const { data: members, error } = await supabase
            .from('t_room_member')
            .select('*, t_user(name), m_role(name, camp)')
            .eq('room_id', roomId)
            .order('order', { ascending: true })
        if( error ) throw new Error("ルームメンバーの取得に失敗しました")
        response.status = true
        response.data = members
    }catch(error) {
        if(error instanceof Error) {
            response.message = error.message
        }
    }finally{
        return response
    }

}