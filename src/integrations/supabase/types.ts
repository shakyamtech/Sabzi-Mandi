export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      cash_transactions: {
        Row: {
          amount: number
          category: string
          created_at: string
          direction: string
          id: string
          note: string | null
          reference_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          category?: string
          created_at?: string
          direction: string
          id?: string
          note?: string | null
          reference_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          direction?: string
          id?: string
          note?: string | null
          reference_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          balance: number
          created_at: string
          id: string
          name: string
          phone: string | null
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          name: string
          phone?: string | null
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
          user_id?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          id: string
          note: string | null
          user_id: string
        }
        Insert: {
          amount: number
          category?: string
          created_at?: string
          id?: string
          note?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          id?: string
          note?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ledger_entries: {
        Row: {
          amount: number
          created_at: string
          entry_type: string
          id: string
          note: string | null
          party_id: string
          party_type: string
          reference_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          entry_type: string
          id?: string
          note?: string | null
          party_id: string
          party_type: string
          reference_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          entry_type?: string
          id?: string
          note?: string | null
          party_id?: string
          party_type?: string
          reference_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          cost_price: number
          created_at: string
          id: string
          low_stock_threshold: number
          name: string
          sell_price: number
          stock_qty: number
          unit: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cost_price?: number
          created_at?: string
          id?: string
          low_stock_threshold?: number
          name: string
          sell_price?: number
          stock_qty?: number
          unit?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cost_price?: number
          created_at?: string
          id?: string
          low_stock_threshold?: number
          name?: string
          sell_price?: number
          stock_qty?: number
          unit?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          shop_name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          shop_name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          shop_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      purchase_items: {
        Row: {
          cost_price: number
          id: string
          line_total: number
          product_id: string | null
          product_name: string
          purchase_id: string
          qty: number
          unit: string
          user_id: string
        }
        Insert: {
          cost_price: number
          id?: string
          line_total: number
          product_id?: string | null
          product_name: string
          purchase_id: string
          qty: number
          unit?: string
          user_id: string
        }
        Update: {
          cost_price?: number
          id?: string
          line_total?: number
          product_id?: string | null
          product_name?: string
          purchase_id?: string
          qty?: number
          unit?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          amount_paid: number
          created_at: string
          id: string
          note: string | null
          payment_mode: string
          supplier_id: string | null
          total: number
          user_id: string
        }
        Insert: {
          amount_paid?: number
          created_at?: string
          id?: string
          note?: string | null
          payment_mode?: string
          supplier_id?: string | null
          total?: number
          user_id: string
        }
        Update: {
          amount_paid?: number
          created_at?: string
          id?: string
          note?: string | null
          payment_mode?: string
          supplier_id?: string | null
          total?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          cost_price: number
          id: string
          line_total: number
          product_id: string | null
          product_name: string
          qty: number
          sale_id: string
          sell_price: number
          unit: string
          user_id: string
        }
        Insert: {
          cost_price?: number
          id?: string
          line_total: number
          product_id?: string | null
          product_name: string
          qty: number
          sale_id: string
          sell_price: number
          unit?: string
          user_id: string
        }
        Update: {
          cost_price?: number
          id?: string
          line_total?: number
          product_id?: string | null
          product_name?: string
          qty?: number
          sale_id?: string
          sell_price?: number
          unit?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          amount_paid: number
          cost_total: number
          created_at: string
          customer_id: string | null
          id: string
          note: string | null
          payment_mode: string
          total: number
          user_id: string
        }
        Insert: {
          amount_paid?: number
          cost_total?: number
          created_at?: string
          customer_id?: string | null
          id?: string
          note?: string | null
          payment_mode?: string
          total?: number
          user_id: string
        }
        Update: {
          amount_paid?: number
          cost_total?: number
          created_at?: string
          customer_id?: string | null
          id?: string
          note?: string | null
          payment_mode?: string
          total?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          balance: number
          created_at: string
          id: string
          name: string
          phone: string | null
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          name: string
          phone?: string | null
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      checkout_sale: {
        Args: {
          p_amount_paid: number
          p_customer_id: string
          p_items: Json
          p_note: string
          p_payment_mode: string
        }
        Returns: string
      }
      delete_purchase: { Args: { p_purchase_id: string }; Returns: undefined }
      delete_sale: { Args: { p_sale_id: string }; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      record_party_payment: {
        Args: {
          p_amount: number
          p_note: string
          p_party_id: string
          p_party_type: string
        }
        Returns: undefined
      }
      record_purchase: {
        Args: {
          p_amount_paid: number
          p_items: Json
          p_note: string
          p_payment_mode: string
          p_supplier_id: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
