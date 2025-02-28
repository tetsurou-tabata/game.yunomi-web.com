'use client'
import { Database } from "@/types/supabasetype"
import { Button } from '@mantine/core';
import { useEffect, useState } from 'react';
import { createClient } from "@/utils/supabase/client";
import { useParams } from 'next/navigation'
import { useRouter } from 'next/navigation'

const roomChannelName = "update-room";

export default function GamePage() {

    const router = useRouter();
    const supabase = createClient();
    const params = useParams<{ roomId: string }>()
    const roomId = params.roomId
    const [player, setPlayer] = useState<Database["public"]["Tables"]["t_room_member"]["Row"]>()

    const fetchRealtimeRoomData = () => {
        try {
            supabase.channel(roomChannelName)
                .on(
                    "postgres_changes",
                    {
                        event: "*",
                        schema: "public",
                        table: "t_room",
                    },
                    (payload) => {
                        if (payload.eventType === "DELETE") {
                            router.push('/')
                        }
                    }
                )
                .subscribe()

            return () => supabase.channel(roomChannelName).unsubscribe()
        } catch (error) {
            console.error(error)
        }
    }

    const getMyStatus = async () => {
        try {
            const { data: user } = await supabase.auth.getUser()
            if (!user) throw new Error();
            const { data, error } = await supabase.from("t_room_member").select("*").eq('user_id', user?.user?.id).eq('room_id', roomId).single()
            if (error) throw error
            setPlayer(data)
        } catch (error) {
            console.error(error)
        }
    }

    const exitGame = async () => {
        try {
            const { data: member, error: memberError } = await supabase.from("t_room_member").delete().eq('room_id', roomId)
            if (memberError) throw memberError
            const { data: room, error: roomError } = await supabase.from("t_room").delete().eq('id', roomId)
            if (roomError) throw roomError
        } catch (error) {
            console.error(error)
        }
    }

    useEffect(() => {
        (async () => {
            await getMyStatus()
        })()
        fetchRealtimeRoomData();
    }, [])

    return (
        <div>
            <h1>Game Page</h1>
            {player && <p>現在のステータス: {player.status}</p>}
            {player?.is_owner && (
                <Button onClick={() => exitGame()}>ゲームを終了</Button>
            )}
        </div>
    )
}