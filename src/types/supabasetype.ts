export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      m_role: {
        Row: {
          camp: number | null
          id: number
          name: string | null
        }
        Insert: {
          camp?: number | null
          id?: number
          name?: string | null
        }
        Update: {
          camp?: number | null
          id?: number
          name?: string | null
        }
        Relationships: []
      }
      t_room: {
        Row: {
          created_at: string
          id: string
          is_start: boolean | null
          member_limit: number | null
          member_num: number | null
          reader: number | null
          step: string | null
          trun: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_start?: boolean | null
          member_limit?: number | null
          member_num?: number | null
          reader?: number | null
          step?: string | null
          trun?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          is_start?: boolean | null
          member_limit?: number | null
          member_num?: number | null
          reader?: number | null
          step?: string | null
          trun?: number | null
        }
        Relationships: []
      }
      t_room_member: {
        Row: {
          created_at: string
          id: string
          is_owner: boolean | null
          member_flag: boolean | null
          mission: string | null
          order: number
          role_id: number | null
          room_id: string
          status: string | null
          user_id: string | null
          vote: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_owner?: boolean | null
          member_flag?: boolean | null
          mission?: string | null
          order?: number
          role_id?: number | null
          room_id: string
          status?: string | null
          user_id?: string | null
          vote?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_owner?: boolean | null
          member_flag?: boolean | null
          mission?: string | null
          order?: number
          role_id?: number | null
          room_id?: string
          status?: string | null
          user_id?: string | null
          vote?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "t_room_member_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "m_role"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "t_room_member_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "t_room"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "t_room_member_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "t_user"
            referencedColumns: ["id"]
          },
        ]
      }
      t_user: {
        Row: {
          created_at: string
          id: string
          name: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment: {
        Args: {
          room_id: string
          x: number
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
