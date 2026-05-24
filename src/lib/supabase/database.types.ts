export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          handle: string;
          avatar_url: string | null;
          role: "member" | "admin";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          handle: string;
          avatar_url?: string | null;
          role?: "member" | "admin";
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      recommendations: {
        Row: {
          id: string;
          author_id: string;
          dish_name: string;
          place_name: string;
          category: "almoco" | "cafe" | "delivery" | "jantar" | "lanche" | "sobremesa";
          city: string;
          neighborhood: string;
          address: string;
          location: unknown;
          latitude: number;
          longitude: number;
          price_paid: number;
          price_band: "ate-30" | "30-60" | "60-100" | "100-plus";
          value_score: 1 | 2 | 3 | 4 | 5;
          summary: string;
          why_worth_it: string;
          status: "active" | "reported" | "hidden";
          report_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          author_id: string;
          dish_name: string;
          place_name: string;
          category: "almoco" | "cafe" | "delivery" | "jantar" | "lanche" | "sobremesa";
          city: string;
          neighborhood: string;
          address: string;
          location?: unknown;
          price_paid: number;
          price_band: "ate-30" | "30-60" | "60-100" | "100-plus";
          value_score: 1 | 2 | 3 | 4 | 5;
          summary: string;
          why_worth_it: string;
        };
        Update: Partial<Database["public"]["Tables"]["recommendations"]["Insert"]> & {
          status?: "active" | "reported" | "hidden";
          report_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: "recommendations_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      recommendation_photos: {
        Row: {
          id: string;
          recommendation_id: string;
          storage_path: string;
          alt_text: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          recommendation_id: string;
          storage_path: string;
          alt_text: string;
          sort_order?: number;
        };
        Update: Partial<Database["public"]["Tables"]["recommendation_photos"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "recommendation_photos_recommendation_id_fkey";
            columns: ["recommendation_id"];
            isOneToOne: false;
            referencedRelation: "recommendations";
            referencedColumns: ["id"];
          },
        ];
      };
      tags: {
        Row: {
          id: string;
          slug: string;
          label: string;
        };
        Insert: {
          id?: string;
          slug: string;
          label: string;
        };
        Update: Partial<Database["public"]["Tables"]["tags"]["Insert"]>;
        Relationships: [];
      };
      recommendation_tags: {
        Row: {
          recommendation_id: string;
          tag_id: string;
        };
        Insert: {
          recommendation_id: string;
          tag_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["recommendation_tags"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "recommendation_tags_recommendation_id_fkey";
            columns: ["recommendation_id"];
            isOneToOne: false;
            referencedRelation: "recommendations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recommendation_tags_tag_id_fkey";
            columns: ["tag_id"];
            isOneToOne: false;
            referencedRelation: "tags";
            referencedColumns: ["id"];
          },
        ];
      };
      reports: {
        Row: {
          id: string;
          recommendation_id: string;
          reporter_id: string;
          reason: string;
          status: "open" | "reviewed" | "dismissed";
          created_at: string;
        };
        Insert: {
          recommendation_id: string;
          reporter_id: string;
          reason: string;
        };
        Update: Partial<Database["public"]["Tables"]["reports"]["Insert"]> & {
          status?: "open" | "reviewed" | "dismissed";
        };
        Relationships: [];
      };
      admin_audit_logs: {
        Row: {
          id: string;
          admin_id: string;
          recommendation_id: string | null;
          action: string;
          created_at: string;
        };
        Insert: {
          admin_id: string;
          recommendation_id?: string | null;
          action: string;
        };
        Update: Partial<Database["public"]["Tables"]["admin_audit_logs"]["Insert"]>;
        Relationships: [];
      };
    };
    Functions: {
      update_recommendation_status: {
        Args: {
          p_admin_id: string;
          p_next_status: "active" | "reported" | "hidden";
          p_recommendation_id: string;
        };
        Returns: void;
      };
    };
    Views: Record<string, never>;
    Enums: {
      user_role: "member" | "admin";
      recommendation_category: "almoco" | "cafe" | "delivery" | "jantar" | "lanche" | "sobremesa";
      price_band: "ate-30" | "30-60" | "60-100" | "100-plus";
      moderation_status: "active" | "reported" | "hidden";
      report_status: "open" | "reviewed" | "dismissed";
    };
    CompositeTypes: Record<string, never>;
  };
}