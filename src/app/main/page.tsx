"use client"
import { Database } from "@/types/supabasetype"
import { createClient } from "@/utils/supabase/client";
import { useState, useEffect } from "react";
import { Button } from "@mantine/core";
import { useRouter } from 'next/navigation'
import { v4 } from "uuid";

const channelName = "update-room";

export default function Main() {

    const supabase = createClient();
    const router = useRouter();
    const [rooms, setRooms] = useState<Database["public"]["Tables"]["t_room"]["Row"][]>([]);

    const fetchRealtimeData = () => {
        try {
            supabase.channel(channelName)
                .on(
                    "postgres_changes",
                    {
                        event: "*",
                        schema: "public",
                        table: "t_room",
                    },
                    (payload) => {
                        getRooms();
                    }
                )
                .subscribe()

            return () => supabase.channel(channelName).unsubscribe()
        } catch (error) {
            console.error(error)
        }
    }

    const getRooms = async () => {
        try {
            const { data, error } = await supabase.from("t_room").select("*").order('created_at', { ascending: true })
            if (error) throw error
            setRooms(data)
        } catch (error) {
            console.error(error)
        }
    }

    const enterRoom = async (roomId: string, isOwner: boolean) => {
        try {
            const { data: user } = await supabase.auth.getUser()
            if (!user) throw new Error();
            const insertData = {
                user_id: user?.user?.id,
                room_id: roomId,
                status: isOwner ? "ready" : "wait",
                is_owner: isOwner
            }
            const { data: room, error } = await supabase.from("t_room_member").upsert(insertData)
            if (error) throw error
            router.push('/room/' + roomId);
        } catch (error) {
            console.error(error)
        }
    }

    const createRoom = async () => {
        try {
            const { data: user } = await supabase.auth.getUser()
            if (!user) throw new Error();
            const roomId = v4();
            const { data: room, error } = await supabase.from("t_room").insert([
                {
                    id: roomId,
                    member_limit: 2,
                }
            ])
            if (error) throw error
            enterRoom(roomId, true);
        } catch (error) {
            console.error(error)
        }
    }

    useEffect(() => {
        (async () => {
            await getRooms()
        })()
        fetchRealtimeData()
    }, [])

    return (
        <div>
            <h1>Main</h1>
            <div className="">
                {rooms.map((room) => (
                    <div key={room.id}>
                        <p>{room.id}</p>
                        <p>{room.member_num}/{room.member_limit}</p>
                        <Button onClick={() => enterRoom(room.id, false)} disabled={room.member_num == room.member_limit}>入室</Button>
                    </div>
                ))}
            </div>
            <Button onClick={() => createRoom()}>新しい部屋を作成</Button>
        </div>
    )
}