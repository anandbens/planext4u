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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          created_at: string | null
          description: string
          id: string
          metadata: Json | null
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string
          id?: string
          metadata?: Json | null
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          metadata?: Json | null
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      advertisements: {
        Row: {
          advertiser: string
          clicks: number
          created_at: string
          description: string | null
          end_date: string
          id: string
          image_url: string | null
          impressions: number
          link_target_id: string | null
          link_type: string | null
          link_url: string | null
          mobile_image_url: string | null
          placement: string
          placements: string[] | null
          revenue: number
          start_date: string
          status: string
          title: string
          type: string
        }
        Insert: {
          advertiser?: string
          clicks?: number
          created_at?: string
          description?: string | null
          end_date?: string
          id: string
          image_url?: string | null
          impressions?: number
          link_target_id?: string | null
          link_type?: string | null
          link_url?: string | null
          mobile_image_url?: string | null
          placement?: string
          placements?: string[] | null
          revenue?: number
          start_date?: string
          status?: string
          title: string
          type?: string
        }
        Update: {
          advertiser?: string
          clicks?: number
          created_at?: string
          description?: string | null
          end_date?: string
          id?: string
          image_url?: string | null
          impressions?: number
          link_target_id?: string | null
          link_type?: string | null
          link_url?: string | null
          mobile_image_url?: string | null
          placement?: string
          placements?: string[] | null
          revenue?: number
          start_date?: string
          status?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      areas: {
        Row: {
          city_id: string
          city_name: string
          country_code: string
          created_at: string
          id: string
          name: string
          pincode: string
          status: string
        }
        Insert: {
          city_id: string
          city_name?: string
          country_code?: string
          created_at?: string
          id: string
          name: string
          pincode?: string
          status?: string
        }
        Update: {
          city_id?: string
          city_name?: string
          country_code?: string
          created_at?: string
          id?: string
          name?: string
          pincode?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "areas_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "areas_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
        ]
      }
      audit_logs: {
        Row: {
          created_at: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          operation: string
          performed_by: string | null
          performed_by_role: string | null
          record_id: string | null
          table_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          operation: string
          performed_by?: string | null
          performed_by_role?: string | null
          record_id?: string | null
          table_name: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          operation?: string
          performed_by?: string | null
          performed_by_role?: string | null
          record_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      banners: {
        Row: {
          created_at: string
          desktop_image: string | null
          end_date: string
          gradient: string | null
          id: string
          link: string
          mobile_image: string | null
          priority: number
          start_date: string
          status: string
          subtitle: string | null
          title: string
        }
        Insert: {
          created_at?: string
          desktop_image?: string | null
          end_date?: string
          gradient?: string | null
          id: string
          link?: string
          mobile_image?: string | null
          priority?: number
          start_date?: string
          status?: string
          subtitle?: string | null
          title: string
        }
        Update: {
          created_at?: string
          desktop_image?: string | null
          end_date?: string
          gradient?: string | null
          id?: string
          link?: string
          mobile_image?: string | null
          priority?: number
          start_date?: string
          status?: string
          subtitle?: string | null
          title?: string
        }
        Relationships: []
      }
      call_ice_candidates: {
        Row: {
          call_id: string
          candidate: Json
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          call_id: string
          candidate: Json
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          call_id?: string
          candidate?: Json
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_ice_candidates_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
        ]
      }
      calls: {
        Row: {
          answer: Json | null
          call_type: string
          callee_id: string
          caller_id: string
          created_at: string
          ended_at: string | null
          id: string
          offer: Json | null
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          answer?: Json | null
          call_type?: string
          callee_id: string
          caller_id: string
          created_at?: string
          ended_at?: string | null
          id?: string
          offer?: Json | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          answer?: Json | null
          call_type?: string
          callee_id?: string
          caller_id?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          offer?: Json | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      cart_rule_applications: {
        Row: {
          applied_at: string
          bearer_breakup: Json
          customer_id: string
          discount_amount: number
          discount_bearer: string
          food_order_id: string | null
          id: string
          order_id: string | null
          rule_id: string
          rule_name: string
          rule_snapshot: Json | null
          vendor_id: string | null
        }
        Insert: {
          applied_at?: string
          bearer_breakup?: Json
          customer_id: string
          discount_amount?: number
          discount_bearer?: string
          food_order_id?: string | null
          id?: string
          order_id?: string | null
          rule_id: string
          rule_name: string
          rule_snapshot?: Json | null
          vendor_id?: string | null
        }
        Update: {
          applied_at?: string
          bearer_breakup?: Json
          customer_id?: string
          discount_amount?: number
          discount_bearer?: string
          food_order_id?: string | null
          id?: string
          order_id?: string | null
          rule_id?: string
          rule_name?: string
          rule_snapshot?: Json | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_rule_applications_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "cart_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_rules: {
        Row: {
          actions: Json
          bearer_split: Json | null
          conditions: Json
          country_code: string
          created_at: string
          created_by: string | null
          description: string | null
          discount_bearer: string
          ends_at: string | null
          id: string
          is_active: boolean
          max_cart_value: number | null
          max_total_uses: number | null
          max_uses_per_customer: number
          min_cart_value: number
          module: string
          name: string
          priority: number
          scope: string
          stackable: boolean
          starts_at: string
          total_uses: number
          updated_at: string
        }
        Insert: {
          actions?: Json
          bearer_split?: Json | null
          conditions?: Json
          country_code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_bearer?: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          max_cart_value?: number | null
          max_total_uses?: number | null
          max_uses_per_customer?: number
          min_cart_value?: number
          module?: string
          name: string
          priority?: number
          scope?: string
          stackable?: boolean
          starts_at?: string
          total_uses?: number
          updated_at?: string
        }
        Update: {
          actions?: Json
          bearer_split?: Json | null
          conditions?: Json
          country_code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_bearer?: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          max_cart_value?: number | null
          max_total_uses?: number | null
          max_uses_per_customer?: number
          min_cart_value?: number
          module?: string
          name?: string
          priority?: number
          scope?: string
          stackable?: boolean
          starts_at?: string
          total_uses?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_rules_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
        ]
      }
      categories: {
        Row: {
          banner_image: string | null
          category_type: string
          commission_rate: number | null
          count: number
          created_at: string
          description: string | null
          display_order: number
          icon: string | null
          id: string
          image: string | null
          is_emergency: boolean | null
          is_trending: boolean | null
          name: string
          parent_id: string | null
          promotion_active: boolean | null
          promotion_banner_url: string | null
          promotion_title: string | null
          show_on_homepage: boolean
          status: string
          theme_accent: string | null
          theme_color: string | null
          verification_status: string | null
        }
        Insert: {
          banner_image?: string | null
          category_type?: string
          commission_rate?: number | null
          count?: number
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string | null
          id: string
          image?: string | null
          is_emergency?: boolean | null
          is_trending?: boolean | null
          name: string
          parent_id?: string | null
          promotion_active?: boolean | null
          promotion_banner_url?: string | null
          promotion_title?: string | null
          show_on_homepage?: boolean
          status?: string
          theme_accent?: string | null
          theme_color?: string | null
          verification_status?: string | null
        }
        Update: {
          banner_image?: string | null
          category_type?: string
          commission_rate?: number | null
          count?: number
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          image?: string | null
          is_emergency?: boolean | null
          is_trending?: boolean | null
          name?: string
          parent_id?: string | null
          promotion_active?: boolean | null
          promotion_banner_url?: string | null
          promotion_title?: string | null
          show_on_homepage?: boolean
          status?: string
          theme_accent?: string | null
          theme_color?: string | null
          verification_status?: string | null
        }
        Relationships: []
      }
      cities: {
        Row: {
          area_count: number
          country_code: string
          created_at: string
          id: string
          name: string
          state: string
          status: string
        }
        Insert: {
          area_count?: number
          country_code?: string
          created_at?: string
          id: string
          name: string
          state: string
          status?: string
        }
        Update: {
          area_count?: number
          country_code?: string
          created_at?: string
          id?: string
          name?: string
          state?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "cities_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
        ]
      }
      classified_ads: {
        Row: {
          area: string
          category: string
          city: string
          country_code: string
          created_at: string
          currency_code: string
          description: string
          id: string
          images: Json | null
          price: number
          status: string
          title: string
          user_id: string
          user_name: string | null
        }
        Insert: {
          area?: string
          category?: string
          city?: string
          country_code?: string
          created_at?: string
          currency_code?: string
          description?: string
          id: string
          images?: Json | null
          price?: number
          status?: string
          title: string
          user_id: string
          user_name?: string | null
        }
        Update: {
          area?: string
          category?: string
          city?: string
          country_code?: string
          created_at?: string
          currency_code?: string
          description?: string
          id?: string
          images?: Json | null
          price?: number
          status?: string
          title?: string
          user_id?: string
          user_name?: string | null
        }
        Relationships: []
      }
      classified_categories: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id?: number
          name: string
        }
        Update: {
          id?: number
          name?: string
        }
        Relationships: []
      }
      cms_pages: {
        Row: {
          content: string
          created_at: string
          id: string
          meta_description: string | null
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          meta_description?: string | null
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          meta_description?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      complaint_messages: {
        Row: {
          attachment_url: string | null
          complaint_id: string
          created_at: string
          id: string
          is_internal: boolean
          message: string
          read_at: string | null
          sender_id: string
          sender_name: string | null
          sender_role: string
        }
        Insert: {
          attachment_url?: string | null
          complaint_id: string
          created_at?: string
          id?: string
          is_internal?: boolean
          message: string
          read_at?: string | null
          sender_id: string
          sender_name?: string | null
          sender_role: string
        }
        Update: {
          attachment_url?: string | null
          complaint_id?: string
          created_at?: string
          id?: string
          is_internal?: boolean
          message?: string
          read_at?: string | null
          sender_id?: string
          sender_name?: string | null
          sender_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "complaint_messages_complaint_id_fkey"
            columns: ["complaint_id"]
            isOneToOne: false
            referencedRelation: "complaints"
            referencedColumns: ["id"]
          },
        ]
      }
      complaints: {
        Row: {
          assigned_to: string | null
          booking_id: string | null
          category: string
          created_at: string
          description: string
          entity_id: string | null
          entity_type: string
          id: string
          images: Json | null
          order_id: string | null
          priority: string
          resolution_notes: string | null
          resolved_at: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
          user_name: string | null
        }
        Insert: {
          assigned_to?: string | null
          booking_id?: string | null
          category?: string
          created_at?: string
          description: string
          entity_id?: string | null
          entity_type: string
          id?: string
          images?: Json | null
          order_id?: string | null
          priority?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_id: string
          user_name?: string | null
        }
        Update: {
          assigned_to?: string | null
          booking_id?: string | null
          category?: string
          created_at?: string
          description?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          images?: Json | null
          order_id?: string | null
          priority?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
          user_name?: string | null
        }
        Relationships: []
      }
      countries: {
        Row: {
          code: string
          created_at: string
          currency_code: string
          currency_position: string
          currency_symbol: string
          decimal_places: number
          decimal_separator: string
          default_tax_rate: number
          display_order: number
          flag_emoji: string | null
          is_active: boolean
          is_default: boolean
          locale_code: string
          name: string
          phone_prefix: string
          tax_inclusive: boolean
          tax_label: string
          thousands_separator: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          currency_code: string
          currency_position?: string
          currency_symbol: string
          decimal_places?: number
          decimal_separator?: string
          default_tax_rate?: number
          display_order?: number
          flag_emoji?: string | null
          is_active?: boolean
          is_default?: boolean
          locale_code?: string
          name: string
          phone_prefix?: string
          tax_inclusive?: boolean
          tax_label?: string
          thousands_separator?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          currency_code?: string
          currency_position?: string
          currency_symbol?: string
          decimal_places?: number
          decimal_separator?: string
          default_tax_rate?: number
          display_order?: number
          flag_emoji?: string | null
          is_active?: boolean
          is_default?: boolean
          locale_code?: string
          name?: string
          phone_prefix?: string
          tax_inclusive?: boolean
          tax_label?: string
          thousands_separator?: string
          updated_at?: string
        }
        Relationships: []
      }
      country_invoice_config: {
        Row: {
          compliance_fields: Json
          country_code: string
          created_at: string
          credit_note_prefix: string
          einvoice_enabled: boolean
          einvoice_provider: string | null
          hsn_label: string | null
          invoice_format: string
          invoice_prefix: string
          legal_footer: string | null
          show_place_of_supply: boolean
          tax_id_label: string
          tax_id_required_for_b2b: boolean
          updated_at: string
        }
        Insert: {
          compliance_fields?: Json
          country_code: string
          created_at?: string
          credit_note_prefix?: string
          einvoice_enabled?: boolean
          einvoice_provider?: string | null
          hsn_label?: string | null
          invoice_format?: string
          invoice_prefix?: string
          legal_footer?: string | null
          show_place_of_supply?: boolean
          tax_id_label?: string
          tax_id_required_for_b2b?: boolean
          updated_at?: string
        }
        Update: {
          compliance_fields?: Json
          country_code?: string
          created_at?: string
          credit_note_prefix?: string
          einvoice_enabled?: boolean
          einvoice_provider?: string | null
          hsn_label?: string | null
          invoice_format?: string
          invoice_prefix?: string
          legal_footer?: string | null
          show_place_of_supply?: boolean
          tax_id_label?: string
          tax_id_required_for_b2b?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "country_invoice_config_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: true
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
        ]
      }
      country_payment_gateways: {
        Row: {
          config: Json
          country_code: string
          created_at: string
          display_name: string
          display_order: number
          gateway: string
          id: string
          is_default: boolean
          is_enabled: boolean
          mode: string
          public_key: string | null
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          config?: Json
          country_code: string
          created_at?: string
          display_name: string
          display_order?: number
          gateway: string
          id?: string
          is_default?: boolean
          is_enabled?: boolean
          mode?: string
          public_key?: string | null
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          config?: Json
          country_code?: string
          created_at?: string
          display_name?: string
          display_order?: number
          gateway?: string
          id?: string
          is_default?: boolean
          is_enabled?: boolean
          mode?: string
          public_key?: string | null
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "country_payment_gateways_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
        ]
      }
      country_switch_log: {
        Row: {
          created_at: string
          from_country_code: string | null
          id: string
          metadata: Json
          reason: string | null
          switched_by: string | null
          switched_by_name: string | null
          to_country_code: string
        }
        Insert: {
          created_at?: string
          from_country_code?: string | null
          id?: string
          metadata?: Json
          reason?: string | null
          switched_by?: string | null
          switched_by_name?: string | null
          to_country_code: string
        }
        Update: {
          created_at?: string
          from_country_code?: string | null
          id?: string
          metadata?: Json
          reason?: string | null
          switched_by?: string | null
          switched_by_name?: string | null
          to_country_code?: string
        }
        Relationships: []
      }
      country_tax_rules: {
        Row: {
          applies_to: string
          country_code: string
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          is_inclusive: boolean
          notes: string | null
          rate: number
          state_code: string | null
          tax_name: string
          tax_type: string
          updated_at: string
        }
        Insert: {
          applies_to?: string
          country_code: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          is_inclusive?: boolean
          notes?: string | null
          rate?: number
          state_code?: string | null
          tax_name: string
          tax_type?: string
          updated_at?: string
        }
        Update: {
          applies_to?: string
          country_code?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          is_inclusive?: boolean
          notes?: string | null
          rate?: number
          state_code?: string | null
          tax_name?: string
          tax_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "country_tax_rules_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
        ]
      }
      coupon_analytics: {
        Row: {
          campaign_id: string
          coupons_available: number
          coupons_expired: number
          coupons_generated: number
          coupons_rolled_back: number
          coupons_used: number
          created_at: string
          discount_given: number
          id: string
          last_refreshed_at: string
          revenue: number
          roi: number
          updated_at: string
        }
        Insert: {
          campaign_id: string
          coupons_available?: number
          coupons_expired?: number
          coupons_generated?: number
          coupons_rolled_back?: number
          coupons_used?: number
          created_at?: string
          discount_given?: number
          id?: string
          last_refreshed_at?: string
          revenue?: number
          roi?: number
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          coupons_available?: number
          coupons_expired?: number
          coupons_generated?: number
          coupons_rolled_back?: number
          coupons_used?: number
          created_at?: string
          discount_given?: number
          id?: string
          last_refreshed_at?: string
          revenue?: number
          roi?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_analytics_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: true
            referencedRelation: "coupon_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_audit_log: {
        Row: {
          actor: string | null
          campaign_id: string | null
          code: string | null
          coupon_code_id: string | null
          created_at: string
          customer_id: string | null
          device: string | null
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          new_status: string | null
          order_id: string | null
          previous_status: string | null
          reason: string | null
          user_agent: string | null
        }
        Insert: {
          actor?: string | null
          campaign_id?: string | null
          code?: string | null
          coupon_code_id?: string | null
          created_at?: string
          customer_id?: string | null
          device?: string | null
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_status?: string | null
          order_id?: string | null
          previous_status?: string | null
          reason?: string | null
          user_agent?: string | null
        }
        Update: {
          actor?: string | null
          campaign_id?: string | null
          code?: string | null
          coupon_code_id?: string | null
          created_at?: string
          customer_id?: string | null
          device?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_status?: string | null
          order_id?: string | null
          previous_status?: string | null
          reason?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      coupon_campaigns: {
        Row: {
          apply_mode: string
          archive_retention_days: number | null
          archived_at: string | null
          banner_url: string | null
          category_ids: string[]
          center_lat: number | null
          center_lng: number | null
          city_ids: string[]
          code_mode: string
          created_at: string
          created_by: string | null
          customer_ids: string[]
          customer_segments: string[]
          daily_usage_limit: number | null
          deleted_at: string | null
          description: string | null
          discount_type: string
          discount_value: number
          district_ids: string[]
          exclusive: boolean
          expires_at: string | null
          first_time_only: boolean
          id: string
          is_active: boolean
          max_discount: number | null
          max_order_amount: number | null
          max_orders: number | null
          max_qty: number | null
          min_lifetime_spend: number | null
          min_order_amount: number
          min_orders: number | null
          min_qty: number | null
          name: string
          per_customer_limit: number
          pincodes: string[]
          popup_description: string | null
          popup_enabled: boolean
          popup_image_url: string | null
          popup_target: string
          popup_title: string | null
          priority: number
          product_ids: string[]
          qty_limit: number
          radius_km: number | null
          release_on_payment_failure: boolean
          reservation_enabled: boolean
          reservation_timeout_minutes: number
          reservation_trigger: string
          rollback_policy: string
          rollback_window_minutes: number | null
          shared_code: string | null
          stackable: boolean
          starts_at: string
          state_codes: string[]
          status: string
          total_codes_generated: number
          total_codes_target: number
          total_codes_used: number
          updated_at: string
          updated_by: string | null
          use_geo_radius: boolean
          vendor_category_ids: string[]
          vendor_id: string | null
          vendor_ids: string[]
        }
        Insert: {
          apply_mode?: string
          archive_retention_days?: number | null
          archived_at?: string | null
          banner_url?: string | null
          category_ids?: string[]
          center_lat?: number | null
          center_lng?: number | null
          city_ids?: string[]
          code_mode?: string
          created_at?: string
          created_by?: string | null
          customer_ids?: string[]
          customer_segments?: string[]
          daily_usage_limit?: number | null
          deleted_at?: string | null
          description?: string | null
          discount_type: string
          discount_value: number
          district_ids?: string[]
          exclusive?: boolean
          expires_at?: string | null
          first_time_only?: boolean
          id?: string
          is_active?: boolean
          max_discount?: number | null
          max_order_amount?: number | null
          max_orders?: number | null
          max_qty?: number | null
          min_lifetime_spend?: number | null
          min_order_amount?: number
          min_orders?: number | null
          min_qty?: number | null
          name: string
          per_customer_limit?: number
          pincodes?: string[]
          popup_description?: string | null
          popup_enabled?: boolean
          popup_image_url?: string | null
          popup_target?: string
          popup_title?: string | null
          priority?: number
          product_ids?: string[]
          qty_limit?: number
          radius_km?: number | null
          release_on_payment_failure?: boolean
          reservation_enabled?: boolean
          reservation_timeout_minutes?: number
          reservation_trigger?: string
          rollback_policy?: string
          rollback_window_minutes?: number | null
          shared_code?: string | null
          stackable?: boolean
          starts_at?: string
          state_codes?: string[]
          status?: string
          total_codes_generated?: number
          total_codes_target?: number
          total_codes_used?: number
          updated_at?: string
          updated_by?: string | null
          use_geo_radius?: boolean
          vendor_category_ids?: string[]
          vendor_id?: string | null
          vendor_ids?: string[]
        }
        Update: {
          apply_mode?: string
          archive_retention_days?: number | null
          archived_at?: string | null
          banner_url?: string | null
          category_ids?: string[]
          center_lat?: number | null
          center_lng?: number | null
          city_ids?: string[]
          code_mode?: string
          created_at?: string
          created_by?: string | null
          customer_ids?: string[]
          customer_segments?: string[]
          daily_usage_limit?: number | null
          deleted_at?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          district_ids?: string[]
          exclusive?: boolean
          expires_at?: string | null
          first_time_only?: boolean
          id?: string
          is_active?: boolean
          max_discount?: number | null
          max_order_amount?: number | null
          max_orders?: number | null
          max_qty?: number | null
          min_lifetime_spend?: number | null
          min_order_amount?: number
          min_orders?: number | null
          min_qty?: number | null
          name?: string
          per_customer_limit?: number
          pincodes?: string[]
          popup_description?: string | null
          popup_enabled?: boolean
          popup_image_url?: string | null
          popup_target?: string
          popup_title?: string | null
          priority?: number
          product_ids?: string[]
          qty_limit?: number
          radius_km?: number | null
          release_on_payment_failure?: boolean
          reservation_enabled?: boolean
          reservation_timeout_minutes?: number
          reservation_trigger?: string
          rollback_policy?: string
          rollback_window_minutes?: number | null
          shared_code?: string | null
          stackable?: boolean
          starts_at?: string
          state_codes?: string[]
          status?: string
          total_codes_generated?: number
          total_codes_target?: number
          total_codes_used?: number
          updated_at?: string
          updated_by?: string | null
          use_geo_radius?: boolean
          vendor_category_ids?: string[]
          vendor_id?: string | null
          vendor_ids?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "coupon_campaigns_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_codes: {
        Row: {
          assigned_customer_id: string | null
          batch_number: string | null
          campaign_id: string
          code: string
          created_at: string
          deleted_at: string | null
          expires_at: string | null
          id: string
          redemption_count: number
          status: string
          updated_at: string
          used_at: string | null
          used_by_customer_id: string | null
          used_by_mobile: string | null
          used_order_id: string | null
        }
        Insert: {
          assigned_customer_id?: string | null
          batch_number?: string | null
          campaign_id: string
          code: string
          created_at?: string
          deleted_at?: string | null
          expires_at?: string | null
          id?: string
          redemption_count?: number
          status?: string
          updated_at?: string
          used_at?: string | null
          used_by_customer_id?: string | null
          used_by_mobile?: string | null
          used_order_id?: string | null
        }
        Update: {
          assigned_customer_id?: string | null
          batch_number?: string | null
          campaign_id?: string
          code?: string
          created_at?: string
          deleted_at?: string | null
          expires_at?: string | null
          id?: string
          redemption_count?: number
          status?: string
          updated_at?: string
          used_at?: string | null
          used_by_customer_id?: string | null
          used_by_mobile?: string | null
          used_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupon_codes_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "coupon_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_customer_mapping: {
        Row: {
          assignment_date: string
          campaign_id: string
          coupon_code_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          deleted_at: string | null
          id: string
          updated_at: string
          usage_status: string
        }
        Insert: {
          assignment_date?: string
          campaign_id: string
          coupon_code_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          deleted_at?: string | null
          id?: string
          updated_at?: string
          usage_status?: string
        }
        Update: {
          assignment_date?: string
          campaign_id?: string
          coupon_code_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          deleted_at?: string | null
          id?: string
          updated_at?: string
          usage_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_customer_mapping_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "coupon_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_customer_mapping_coupon_code_id_fkey"
            columns: ["coupon_code_id"]
            isOneToOne: false
            referencedRelation: "coupon_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_geo_mapping: {
        Row: {
          campaign_id: string
          city: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          district: string | null
          id: string
          is_active: boolean
          latitude: number | null
          longitude: number | null
          pincode: string | null
          radius_km: number | null
          state: string | null
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          campaign_id: string
          city?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          district?: string | null
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          pincode?: string | null
          radius_km?: number | null
          state?: string | null
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          campaign_id?: string
          city?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          district?: string | null
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          pincode?: string | null
          radius_km?: number | null
          state?: string | null
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupon_geo_mapping_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "coupon_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_notifications: {
        Row: {
          campaign_id: string | null
          coupon_code_id: string | null
          created_at: string
          customer_id: string | null
          email_status: string
          id: string
          notification_type: string
          payload: Json
          push_status: string
          sent_at: string | null
          sms_status: string
          updated_at: string
          whatsapp_status: string
        }
        Insert: {
          campaign_id?: string | null
          coupon_code_id?: string | null
          created_at?: string
          customer_id?: string | null
          email_status?: string
          id?: string
          notification_type: string
          payload?: Json
          push_status?: string
          sent_at?: string | null
          sms_status?: string
          updated_at?: string
          whatsapp_status?: string
        }
        Update: {
          campaign_id?: string | null
          coupon_code_id?: string | null
          created_at?: string
          customer_id?: string | null
          email_status?: string
          id?: string
          notification_type?: string
          payload?: Json
          push_status?: string
          sent_at?: string | null
          sms_status?: string
          updated_at?: string
          whatsapp_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_notifications_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "coupon_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_notifications_coupon_code_id_fkey"
            columns: ["coupon_code_id"]
            isOneToOne: false
            referencedRelation: "coupon_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_popup_config: {
        Row: {
          campaign_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          dismiss_allowed: boolean
          display_priority: number
          id: string
          is_active: boolean
          popup_description: string | null
          popup_frequency: string
          popup_image_url: string | null
          popup_title: string | null
          updated_at: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          dismiss_allowed?: boolean
          display_priority?: number
          id?: string
          is_active?: boolean
          popup_description?: string | null
          popup_frequency?: string
          popup_image_url?: string | null
          popup_title?: string | null
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          dismiss_allowed?: boolean
          display_priority?: number
          id?: string
          is_active?: boolean
          popup_description?: string | null
          popup_frequency?: string
          popup_image_url?: string | null
          popup_title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_popup_config_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: true
            referencedRelation: "coupon_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_popup_dismissals: {
        Row: {
          campaign_id: string
          customer_id: string
          dismissed_permanently: boolean
          id: string
          last_dismissed_at: string
        }
        Insert: {
          campaign_id: string
          customer_id: string
          dismissed_permanently?: boolean
          id?: string
          last_dismissed_at?: string
        }
        Update: {
          campaign_id?: string
          customer_id?: string
          dismissed_permanently?: boolean
          id?: string
          last_dismissed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_popup_dismissals_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "coupon_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_product_mapping: {
        Row: {
          campaign_id: string
          coupon_code_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          product_id: string
          updated_at: string
        }
        Insert: {
          campaign_id: string
          coupon_code_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          product_id: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          coupon_code_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_product_mapping_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "coupon_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_product_mapping_coupon_code_id_fkey"
            columns: ["coupon_code_id"]
            isOneToOne: false
            referencedRelation: "coupon_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_recommendation_log: {
        Row: {
          campaign_id: string | null
          cart_snapshot: Json | null
          coupon_code: string | null
          created_at: string
          customer_id: string | null
          device: string | null
          event: string
          id: string
          ip: string | null
          savings: number | null
          user_agent: string | null
        }
        Insert: {
          campaign_id?: string | null
          cart_snapshot?: Json | null
          coupon_code?: string | null
          created_at?: string
          customer_id?: string | null
          device?: string | null
          event: string
          id?: string
          ip?: string | null
          savings?: number | null
          user_agent?: string | null
        }
        Update: {
          campaign_id?: string | null
          cart_snapshot?: Json | null
          coupon_code?: string | null
          created_at?: string
          customer_id?: string | null
          device?: string | null
          event?: string
          id?: string
          ip?: string | null
          savings?: number | null
          user_agent?: string | null
        }
        Relationships: []
      }
      coupon_redemptions: {
        Row: {
          campaign_id: string
          code: string
          coupon_code_id: string | null
          customer_id: string
          customer_mobile: string | null
          discount_amount: number
          id: string
          order_id: string | null
          product_id: string | null
          redeemed_at: string
          rollback_event: string | null
          rollback_reason: string | null
          rolled_back: boolean
          rolled_back_at: string | null
          rolled_back_by: string | null
        }
        Insert: {
          campaign_id: string
          code: string
          coupon_code_id?: string | null
          customer_id: string
          customer_mobile?: string | null
          discount_amount?: number
          id?: string
          order_id?: string | null
          product_id?: string | null
          redeemed_at?: string
          rollback_event?: string | null
          rollback_reason?: string | null
          rolled_back?: boolean
          rolled_back_at?: string | null
          rolled_back_by?: string | null
        }
        Update: {
          campaign_id?: string
          code?: string
          coupon_code_id?: string | null
          customer_id?: string
          customer_mobile?: string | null
          discount_amount?: number
          id?: string
          order_id?: string | null
          product_id?: string | null
          redeemed_at?: string
          rollback_event?: string | null
          rollback_reason?: string | null
          rolled_back?: boolean
          rolled_back_at?: string | null
          rolled_back_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "coupon_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_coupon_code_id_fkey"
            columns: ["coupon_code_id"]
            isOneToOne: false
            referencedRelation: "coupon_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_reservations: {
        Row: {
          campaign_id: string
          cart_id: string | null
          code: string
          coupon_code_id: string | null
          created_at: string
          customer_id: string
          device: string | null
          expires_at: string
          id: string
          ip_address: string | null
          order_id: string | null
          payment_reference: string | null
          redeemed_at: string | null
          release_reason: string | null
          released_at: string | null
          reserved_at: string
          status: string
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          campaign_id: string
          cart_id?: string | null
          code: string
          coupon_code_id?: string | null
          created_at?: string
          customer_id: string
          device?: string | null
          expires_at: string
          id?: string
          ip_address?: string | null
          order_id?: string | null
          payment_reference?: string | null
          redeemed_at?: string | null
          release_reason?: string | null
          released_at?: string | null
          reserved_at?: string
          status?: string
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          campaign_id?: string
          cart_id?: string | null
          code?: string
          coupon_code_id?: string | null
          created_at?: string
          customer_id?: string
          device?: string | null
          expires_at?: string
          id?: string
          ip_address?: string | null
          order_id?: string | null
          payment_reference?: string | null
          redeemed_at?: string | null
          release_reason?: string | null
          released_at?: string | null
          reserved_at?: string
          status?: string
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      coupon_rollback_history: {
        Row: {
          campaign_id: string | null
          code: string | null
          coupon_code_id: string | null
          created_at: string
          id: string
          metadata: Json
          new_status: string | null
          old_status: string | null
          order_id: string | null
          refund_id: string | null
          rollback_reason: string | null
          rolled_back_at: string
          rolled_back_by: string | null
        }
        Insert: {
          campaign_id?: string | null
          code?: string | null
          coupon_code_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          new_status?: string | null
          old_status?: string | null
          order_id?: string | null
          refund_id?: string | null
          rollback_reason?: string | null
          rolled_back_at?: string
          rolled_back_by?: string | null
        }
        Update: {
          campaign_id?: string | null
          code?: string | null
          coupon_code_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          new_status?: string | null
          old_status?: string | null
          order_id?: string | null
          refund_id?: string | null
          rollback_reason?: string | null
          rolled_back_at?: string
          rolled_back_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupon_rollback_history_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "coupon_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_rollback_history_coupon_code_id_fkey"
            columns: ["coupon_code_id"]
            isOneToOne: false
            referencedRelation: "coupon_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_usage_history: {
        Row: {
          applied_at: string | null
          campaign_id: string | null
          code: string | null
          coupon_code_id: string | null
          created_at: string
          customer_id: string | null
          deleted_at: string | null
          discount_amount: number
          discount_percent: number | null
          id: string
          metadata: Json
          order_amount: number
          order_id: string | null
          product_id: string | null
          redeemed_at: string | null
          status: string
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          applied_at?: string | null
          campaign_id?: string | null
          code?: string | null
          coupon_code_id?: string | null
          created_at?: string
          customer_id?: string | null
          deleted_at?: string | null
          discount_amount?: number
          discount_percent?: number | null
          id?: string
          metadata?: Json
          order_amount?: number
          order_id?: string | null
          product_id?: string | null
          redeemed_at?: string | null
          status?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          applied_at?: string | null
          campaign_id?: string | null
          code?: string | null
          coupon_code_id?: string | null
          created_at?: string
          customer_id?: string | null
          deleted_at?: string | null
          discount_amount?: number
          discount_percent?: number | null
          id?: string
          metadata?: Json
          order_amount?: number
          order_id?: string | null
          product_id?: string | null
          redeemed_at?: string | null
          status?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupon_usage_history_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "coupon_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_usage_history_coupon_code_id_fkey"
            columns: ["coupon_code_id"]
            isOneToOne: false
            referencedRelation: "coupon_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_vendor_mapping: {
        Row: {
          campaign_id: string
          coupon_code_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          updated_at: string
          vendor_id: string
        }
        Insert: {
          campaign_id: string
          coupon_code_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
          vendor_id: string
        }
        Update: {
          campaign_id?: string
          coupon_code_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_vendor_mapping_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "coupon_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_vendor_mapping_coupon_code_id_fkey"
            columns: ["coupon_code_id"]
            isOneToOne: false
            referencedRelation: "coupon_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_notes: {
        Row: {
          cgst_amount: number
          created_at: string
          credit_note_no: string
          customer_id: string
          customer_name: string | null
          fy_start: number
          id: string
          igst_amount: number
          is_interstate: boolean
          issue_date: string
          notes: string | null
          order_id: string | null
          original_invoice_id: string | null
          original_invoice_no: string | null
          pdf_url: string | null
          place_of_supply_code: string | null
          reason: string
          sgst_amount: number
          taxable_value: number
          total_amount: number
          vendor_gstin: string | null
          vendor_id: string
        }
        Insert: {
          cgst_amount?: number
          created_at?: string
          credit_note_no: string
          customer_id: string
          customer_name?: string | null
          fy_start: number
          id?: string
          igst_amount?: number
          is_interstate?: boolean
          issue_date?: string
          notes?: string | null
          order_id?: string | null
          original_invoice_id?: string | null
          original_invoice_no?: string | null
          pdf_url?: string | null
          place_of_supply_code?: string | null
          reason?: string
          sgst_amount?: number
          taxable_value?: number
          total_amount?: number
          vendor_gstin?: string | null
          vendor_id: string
        }
        Update: {
          cgst_amount?: number
          created_at?: string
          credit_note_no?: string
          customer_id?: string
          customer_name?: string | null
          fy_start?: number
          id?: string
          igst_amount?: number
          is_interstate?: boolean
          issue_date?: string
          notes?: string | null
          order_id?: string | null
          original_invoice_id?: string | null
          original_invoice_no?: string | null
          pdf_url?: string | null
          place_of_supply_code?: string | null
          reason?: string
          sgst_amount?: number
          taxable_value?: number
          total_amount?: number
          vendor_gstin?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_notes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_original_invoice_id_fkey"
            columns: ["original_invoice_id"]
            isOneToOne: false
            referencedRelation: "order_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_addresses: {
        Row: {
          address_line: string
          city: string
          country_code: string
          created_at: string | null
          customer_id: string
          id: string
          is_default: boolean | null
          label: string
          latitude: number | null
          longitude: number | null
          pincode: string
          postal_code: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          address_line: string
          city?: string
          country_code?: string
          created_at?: string | null
          customer_id: string
          id?: string
          is_default?: boolean | null
          label?: string
          latitude?: number | null
          longitude?: number | null
          pincode?: string
          postal_code?: string | null
          type?: string
          updated_at?: string | null
        }
        Update: {
          address_line?: string
          city?: string
          country_code?: string
          created_at?: string | null
          customer_id?: string
          id?: string
          is_default?: boolean | null
          label?: string
          latitude?: number | null
          longitude?: number | null
          pincode?: string
          postal_code?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      customer_notifications: {
        Row: {
          created_at: string
          customer_id: string
          deep_link: string | null
          id: string
          is_read: boolean
          message: string
          reference_id: string | null
          reference_type: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          deep_link?: string | null
          id?: string
          is_read?: boolean
          message: string
          reference_id?: string | null
          reference_type?: string | null
          title: string
          type: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          deep_link?: string | null
          id?: string
          is_read?: boolean
          message?: string
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          about: string | null
          area_id: string | null
          city_id: string | null
          country_code: string
          created_at: string
          currency_code: string
          deleted_at: string | null
          deletion_reason: string | null
          dob: string | null
          email: string
          gender: string | null
          id: string
          kyc_status: string | null
          latitude: number
          longitude: number
          mobile: string
          name: string
          occupation: string | null
          profile_completeness: number | null
          profile_photo: string | null
          referral_code: string
          referred_by: string | null
          status: string
          tax_id: string | null
          tax_id_type: string | null
          wallet_points: number
        }
        Insert: {
          about?: string | null
          area_id?: string | null
          city_id?: string | null
          country_code?: string
          created_at?: string
          currency_code?: string
          deleted_at?: string | null
          deletion_reason?: string | null
          dob?: string | null
          email?: string
          gender?: string | null
          id: string
          kyc_status?: string | null
          latitude?: number
          longitude?: number
          mobile?: string
          name: string
          occupation?: string | null
          profile_completeness?: number | null
          profile_photo?: string | null
          referral_code?: string
          referred_by?: string | null
          status?: string
          tax_id?: string | null
          tax_id_type?: string | null
          wallet_points?: number
        }
        Update: {
          about?: string | null
          area_id?: string | null
          city_id?: string | null
          country_code?: string
          created_at?: string
          currency_code?: string
          deleted_at?: string | null
          deletion_reason?: string | null
          dob?: string | null
          email?: string
          gender?: string | null
          id?: string
          kyc_status?: string | null
          latitude?: number
          longitude?: number
          mobile?: string
          name?: string
          occupation?: string | null
          profile_completeness?: number | null
          profile_photo?: string | null
          referral_code?: string
          referred_by?: string | null
          status?: string
          tax_id?: string | null
          tax_id_type?: string | null
          wallet_points?: number
        }
        Relationships: [
          {
            foreignKeyName: "customers_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_proofs: {
        Row: {
          confirmation_type: string
          created_at: string
          customer_id: string
          id: string
          notes: string | null
          order_id: string
          photo_url: string | null
          recipient_name: string | null
          submitted_at: string
        }
        Insert: {
          confirmation_type?: string
          created_at?: string
          customer_id: string
          id?: string
          notes?: string | null
          order_id: string
          photo_url?: string | null
          recipient_name?: string | null
          submitted_at?: string
        }
        Update: {
          confirmation_type?: string
          created_at?: string
          customer_id?: string
          id?: string
          notes?: string | null
          order_id?: string
          photo_url?: string | null
          recipient_name?: string | null
          submitted_at?: string
        }
        Relationships: []
      }
      districts: {
        Row: {
          country_code: string
          created_at: string
          id: string
          name: string
          state_id: string
          status: string
        }
        Insert: {
          country_code?: string
          created_at?: string
          id?: string
          name: string
          state_id: string
          status?: string
        }
        Update: {
          country_code?: string
          created_at?: string
          id?: string
          name?: string
          state_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "districts_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "districts_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["id"]
          },
        ]
      }
      dropshipping_orders: {
        Row: {
          carrier: string | null
          cost_total: number
          created_at: string
          currency_code: string
          delivered_at: string | null
          error_message: string | null
          expected_delivery_date: string | null
          forwarded_at: string | null
          id: string
          items: Json
          margin_amount: number
          notes: string | null
          order_id: string
          status: string
          supplier_id: string
          supplier_order_ref: string | null
          tracking_number: string | null
          tracking_url: string | null
          updated_at: string
          vendor_id: string
        }
        Insert: {
          carrier?: string | null
          cost_total?: number
          created_at?: string
          currency_code?: string
          delivered_at?: string | null
          error_message?: string | null
          expected_delivery_date?: string | null
          forwarded_at?: string | null
          id?: string
          items?: Json
          margin_amount?: number
          notes?: string | null
          order_id: string
          status?: string
          supplier_id: string
          supplier_order_ref?: string | null
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
          vendor_id: string
        }
        Update: {
          carrier?: string | null
          cost_total?: number
          created_at?: string
          currency_code?: string
          delivered_at?: string | null
          error_message?: string | null
          expected_delivery_date?: string | null
          forwarded_at?: string | null
          id?: string
          items?: Json
          margin_amount?: number
          notes?: string | null
          order_id?: string
          status?: string
          supplier_id?: string
          supplier_order_ref?: string | null
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dropshipping_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "dropshipping_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      dropshipping_supplier_products: {
        Row: {
          available_stock: number | null
          cost_price: number
          created_at: string
          currency_code: string
          id: string
          is_active: boolean
          last_synced_at: string | null
          moq: number
          product_id: string | null
          stock_buffer: number
          supplier_id: string
          supplier_product_name: string | null
          supplier_sku: string
          updated_at: string
        }
        Insert: {
          available_stock?: number | null
          cost_price?: number
          created_at?: string
          currency_code?: string
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          moq?: number
          product_id?: string | null
          stock_buffer?: number
          supplier_id: string
          supplier_product_name?: string | null
          supplier_sku: string
          updated_at?: string
        }
        Update: {
          available_stock?: number | null
          cost_price?: number
          created_at?: string
          currency_code?: string
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          moq?: number
          product_id?: string | null
          stock_buffer?: number
          supplier_id?: string
          supplier_product_name?: string | null
          supplier_sku?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dropshipping_supplier_products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "dropshipping_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      dropshipping_suppliers: {
        Row: {
          api_endpoint: string | null
          api_key_secret_name: string | null
          commission_percent: number
          contact_email: string | null
          contact_phone: string | null
          country_code: string | null
          created_at: string
          currency_code: string
          default_lead_time_days: number
          default_markup_percent: number
          id: string
          name: string
          notes: string | null
          shipping_methods: Json
          status: string
          updated_at: string
          website: string | null
        }
        Insert: {
          api_endpoint?: string | null
          api_key_secret_name?: string | null
          commission_percent?: number
          contact_email?: string | null
          contact_phone?: string | null
          country_code?: string | null
          created_at?: string
          currency_code?: string
          default_lead_time_days?: number
          default_markup_percent?: number
          id?: string
          name: string
          notes?: string | null
          shipping_methods?: Json
          status?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          api_endpoint?: string | null
          api_key_secret_name?: string | null
          commission_percent?: number
          contact_email?: string | null
          contact_phone?: string | null
          country_code?: string | null
          created_at?: string
          currency_code?: string
          default_lead_time_days?: number
          default_markup_percent?: number
          id?: string
          name?: string
          notes?: string | null
          shipping_methods?: Json
          status?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dropshipping_suppliers_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_subscriptions: {
        Row: {
          created_at: string
          email: string
          id: string
          source: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          source?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          source?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      file_upload_rows: {
        Row: {
          action: string | null
          created_at: string
          error_messages: Json | null
          id: string
          raw_data: Json
          resulting_record_id: string | null
          row_number: number
          status: string
          upload_id: string
        }
        Insert: {
          action?: string | null
          created_at?: string
          error_messages?: Json | null
          id?: string
          raw_data: Json
          resulting_record_id?: string | null
          row_number: number
          status?: string
          upload_id: string
        }
        Update: {
          action?: string | null
          created_at?: string
          error_messages?: Json | null
          id?: string
          raw_data?: Json
          resulting_record_id?: string | null
          row_number?: number
          status?: string
          upload_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_upload_rows_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "file_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      file_uploads: {
        Row: {
          created_at: string
          error_count: number
          error_log: Json | null
          file_name: string
          file_url: string | null
          id: string
          original_file_path: string | null
          status: string
          success_count: number
          total_records: number
          updated_at: string
          upload_type: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          error_count?: number
          error_log?: Json | null
          file_name: string
          file_url?: string | null
          id?: string
          original_file_path?: string | null
          status?: string
          success_count?: number
          total_records?: number
          updated_at?: string
          upload_type?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          error_count?: number
          error_log?: Json | null
          file_name?: string
          file_url?: string | null
          id?: string
          original_file_path?: string | null
          status?: string
          success_count?: number
          total_records?: number
          updated_at?: string
          upload_type?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      food_cancellation_reasons: {
        Row: {
          applies_to: string
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          reason: string
        }
        Insert: {
          applies_to?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          reason: string
        }
        Update: {
          applies_to?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          reason?: string
        }
        Relationships: []
      }
      food_coupon_redemptions: {
        Row: {
          coupon_code: string
          coupon_id: string
          created_at: string
          customer_id: string
          discount_applied: number
          id: string
          order_id: string
        }
        Insert: {
          coupon_code: string
          coupon_id: string
          created_at?: string
          customer_id: string
          discount_applied?: number
          id?: string
          order_id: string
        }
        Update: {
          coupon_code?: string
          coupon_id?: string
          created_at?: string
          customer_id?: string
          discount_applied?: number
          id?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "food_coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_coupon_redemptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "food_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      food_coupons: {
        Row: {
          code: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          is_platform_wide: boolean
          max_discount: number | null
          min_order_amount: number
          per_customer_limit: number
          restaurant_id: string | null
          starts_at: string
          title: string
          total_usage_limit: number | null
          updated_at: string
          usage_count: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          is_platform_wide?: boolean
          max_discount?: number | null
          min_order_amount?: number
          per_customer_limit?: number
          restaurant_id?: string | null
          starts_at?: string
          title: string
          total_usage_limit?: number | null
          updated_at?: string
          usage_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          is_platform_wide?: boolean
          max_discount?: number | null
          min_order_amount?: number
          per_customer_limit?: number
          restaurant_id?: string | null
          starts_at?: string
          title?: string
          total_usage_limit?: number | null
          updated_at?: string
          usage_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "food_coupons_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      food_invoices: {
        Row: {
          customer_id: string
          delivery_fee: number
          discount: number
          generated_at: string
          id: string
          invoice_no: string
          metadata: Json | null
          order_id: string
          packaging_fee: number
          payment_id: string | null
          payment_method: string | null
          pdf_url: string | null
          platform_fee: number
          restaurant_id: string
          subtotal: number
          tax: number
          total: number
        }
        Insert: {
          customer_id: string
          delivery_fee?: number
          discount?: number
          generated_at?: string
          id?: string
          invoice_no: string
          metadata?: Json | null
          order_id: string
          packaging_fee?: number
          payment_id?: string | null
          payment_method?: string | null
          pdf_url?: string | null
          platform_fee?: number
          restaurant_id: string
          subtotal?: number
          tax?: number
          total?: number
        }
        Update: {
          customer_id?: string
          delivery_fee?: number
          discount?: number
          generated_at?: string
          id?: string
          invoice_no?: string
          metadata?: Json | null
          order_id?: string
          packaging_fee?: number
          payment_id?: string | null
          payment_method?: string | null
          pdf_url?: string | null
          platform_fee?: number
          restaurant_id?: string
          subtotal?: number
          tax?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "food_invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "food_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      food_order_chats: {
        Row: {
          created_at: string
          id: string
          is_quick_reply: boolean
          message: string
          order_id: string
          read_at: string | null
          sender_id: string
          sender_role: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_quick_reply?: boolean
          message: string
          order_id: string
          read_at?: string | null
          sender_id: string
          sender_role: string
        }
        Update: {
          created_at?: string
          id?: string
          is_quick_reply?: boolean
          message?: string
          order_id?: string
          read_at?: string | null
          sender_id?: string
          sender_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_order_chats_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "food_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      food_order_status_history: {
        Row: {
          changed_by: string | null
          changed_by_role: string | null
          created_at: string
          from_status: string | null
          id: string
          notes: string | null
          order_id: string
          to_status: string
        }
        Insert: {
          changed_by?: string | null
          changed_by_role?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          notes?: string | null
          order_id: string
          to_status: string
        }
        Update: {
          changed_by?: string | null
          changed_by_role?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "food_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      food_orders: {
        Row: {
          accepted_at: string | null
          applied_cart_rules: Json
          cancellation_reason: string | null
          cart_rule_discount: number
          country_code: string
          coupon_code: string | null
          created_at: string
          currency_code: string
          customer_id: string
          customer_name: string | null
          customer_notes: string | null
          customer_phone: string | null
          delivered_at: string | null
          delivery_address: string
          delivery_fee: number
          delivery_lat: number | null
          delivery_lng: number | null
          discount: number
          distance_km: number | null
          donation_amount: number
          eta_minutes: number | null
          gst: number
          handover_otp: string | null
          id: string
          invoice_no: string | null
          is_contactless: boolean
          items: Json
          no_cutlery: boolean
          p4u_cut: number
          packaging_fee: number
          payment_method: string
          payment_status: string
          picked_up_at: string | null
          placed_at: string
          platform_fee: number
          points_used: number
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          ready_at: string | null
          refund_amount: number
          refund_status: string | null
          restaurant_id: string
          restaurant_name: string | null
          restaurant_payout: number
          rider_note: string | null
          rider_payout: number
          rider_tip: number
          scheduled_for: string | null
          status: string
          subtotal: number
          total: number
          updated_at: string
          wallet_amount_used: number
        }
        Insert: {
          accepted_at?: string | null
          applied_cart_rules?: Json
          cancellation_reason?: string | null
          cart_rule_discount?: number
          country_code?: string
          coupon_code?: string | null
          created_at?: string
          currency_code?: string
          customer_id: string
          customer_name?: string | null
          customer_notes?: string | null
          customer_phone?: string | null
          delivered_at?: string | null
          delivery_address: string
          delivery_fee?: number
          delivery_lat?: number | null
          delivery_lng?: number | null
          discount?: number
          distance_km?: number | null
          donation_amount?: number
          eta_minutes?: number | null
          gst?: number
          handover_otp?: string | null
          id: string
          invoice_no?: string | null
          is_contactless?: boolean
          items?: Json
          no_cutlery?: boolean
          p4u_cut?: number
          packaging_fee?: number
          payment_method?: string
          payment_status?: string
          picked_up_at?: string | null
          placed_at?: string
          platform_fee?: number
          points_used?: number
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          ready_at?: string | null
          refund_amount?: number
          refund_status?: string | null
          restaurant_id: string
          restaurant_name?: string | null
          restaurant_payout?: number
          rider_note?: string | null
          rider_payout?: number
          rider_tip?: number
          scheduled_for?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          wallet_amount_used?: number
        }
        Update: {
          accepted_at?: string | null
          applied_cart_rules?: Json
          cancellation_reason?: string | null
          cart_rule_discount?: number
          country_code?: string
          coupon_code?: string | null
          created_at?: string
          currency_code?: string
          customer_id?: string
          customer_name?: string | null
          customer_notes?: string | null
          customer_phone?: string | null
          delivered_at?: string | null
          delivery_address?: string
          delivery_fee?: number
          delivery_lat?: number | null
          delivery_lng?: number | null
          discount?: number
          distance_km?: number | null
          donation_amount?: number
          eta_minutes?: number | null
          gst?: number
          handover_otp?: string | null
          id?: string
          invoice_no?: string | null
          is_contactless?: boolean
          items?: Json
          no_cutlery?: boolean
          p4u_cut?: number
          packaging_fee?: number
          payment_method?: string
          payment_status?: string
          picked_up_at?: string | null
          placed_at?: string
          platform_fee?: number
          points_used?: number
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          ready_at?: string | null
          refund_amount?: number
          refund_status?: string | null
          restaurant_id?: string
          restaurant_name?: string | null
          restaurant_payout?: number
          rider_note?: string | null
          rider_payout?: number
          rider_tip?: number
          scheduled_for?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          wallet_amount_used?: number
        }
        Relationships: [
          {
            foreignKeyName: "food_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      food_payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          customer_id: string
          failure_reason: string | null
          id: string
          metadata: Json | null
          order_id: string
          payment_method: string
          payment_provider: string
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          razorpay_refund_id: string | null
          razorpay_signature: string | null
          status: string
          txn_type: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          customer_id: string
          failure_reason?: string | null
          id?: string
          metadata?: Json | null
          order_id: string
          payment_method: string
          payment_provider?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_refund_id?: string | null
          razorpay_signature?: string | null
          status?: string
          txn_type?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          customer_id?: string
          failure_reason?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string
          payment_method?: string
          payment_provider?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_refund_id?: string | null
          razorpay_signature?: string | null
          status?: string
          txn_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "food_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      food_refunds: {
        Row: {
          amount: number
          completed_at: string | null
          customer_id: string
          id: string
          initiated_at: string
          initiated_by: string | null
          metadata: Json | null
          notes: string | null
          order_id: string
          razorpay_refund_id: string | null
          reason: string
          refund_method: string
          status: string
        }
        Insert: {
          amount: number
          completed_at?: string | null
          customer_id: string
          id?: string
          initiated_at?: string
          initiated_by?: string | null
          metadata?: Json | null
          notes?: string | null
          order_id: string
          razorpay_refund_id?: string | null
          reason?: string
          refund_method?: string
          status?: string
        }
        Update: {
          amount?: number
          completed_at?: string | null
          customer_id?: string
          id?: string
          initiated_at?: string
          initiated_by?: string | null
          metadata?: Json | null
          notes?: string | null
          order_id?: string
          razorpay_refund_id?: string | null
          reason?: string
          refund_method?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_refunds_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "food_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      food_review_helpful: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          review_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          review_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          review_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_review_helpful_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "food_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      food_reviews: {
        Row: {
          comment: string | null
          created_at: string
          customer_id: string
          edited_at: string | null
          food_rating: number | null
          helpful_count: number
          id: string
          order_id: string
          photos: Json | null
          restaurant_id: string
          restaurant_rating: number | null
          restaurant_reply: string | null
          restaurant_reply_at: string | null
          rider_id: string | null
          rider_rating: number | null
          rider_tags: string[] | null
          status: string
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          customer_id: string
          edited_at?: string | null
          food_rating?: number | null
          helpful_count?: number
          id?: string
          order_id: string
          photos?: Json | null
          restaurant_id: string
          restaurant_rating?: number | null
          restaurant_reply?: string | null
          restaurant_reply_at?: string | null
          rider_id?: string | null
          rider_rating?: number | null
          rider_tags?: string[] | null
          status?: string
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          customer_id?: string
          edited_at?: string | null
          food_rating?: number | null
          helpful_count?: number
          id?: string
          order_id?: string
          photos?: Json | null
          restaurant_id?: string
          restaurant_rating?: number | null
          restaurant_reply?: string | null
          restaurant_reply_at?: string | null
          rider_id?: string | null
          rider_rating?: number | null
          rider_tags?: string[] | null
          status?: string
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_reviews_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "food_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_reviews_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_reviews_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
        ]
      }
      fraud_alerts: {
        Row: {
          campaign_id: string | null
          code: string | null
          created_at: string
          customer_id: string | null
          description: string | null
          device_fingerprint: string | null
          evaluation_id: string | null
          event: string
          id: string
          ip_address: string | null
          metadata: Json
          mobile: string | null
          order_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          score: number
          severity: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          campaign_id?: string | null
          code?: string | null
          created_at?: string
          customer_id?: string | null
          description?: string | null
          device_fingerprint?: string | null
          evaluation_id?: string | null
          event: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          mobile?: string | null
          order_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          score?: number
          severity?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string | null
          code?: string | null
          created_at?: string
          customer_id?: string | null
          description?: string | null
          device_fingerprint?: string | null
          evaluation_id?: string | null
          event?: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          mobile?: string | null
          order_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          score?: number
          severity?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fraud_alerts_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "fraud_evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      fraud_blacklist: {
        Row: {
          created_at: string
          created_by: string | null
          entity_type: string
          entity_value: string
          expires_at: string | null
          id: string
          metadata: Json
          reason: string | null
          severity: string
          source: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          entity_type: string
          entity_value: string
          expires_at?: string | null
          id?: string
          metadata?: Json
          reason?: string | null
          severity?: string
          source?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          entity_type?: string
          entity_value?: string
          expires_at?: string | null
          id?: string
          metadata?: Json
          reason?: string | null
          severity?: string
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      fraud_device_fingerprints: {
        Row: {
          app_version: string | null
          browser: string | null
          created_at: string
          customer_id: string | null
          device_model: string | null
          fingerprint: string
          first_seen_at: string
          hardware_id: string | null
          id: string
          ip_address: string | null
          language: string | null
          last_seen_at: string
          metadata: Json
          mobile: string | null
          os_name: string | null
          os_version: string | null
          screen: string | null
          seen_count: number
          timezone: string | null
          updated_at: string
        }
        Insert: {
          app_version?: string | null
          browser?: string | null
          created_at?: string
          customer_id?: string | null
          device_model?: string | null
          fingerprint: string
          first_seen_at?: string
          hardware_id?: string | null
          id?: string
          ip_address?: string | null
          language?: string | null
          last_seen_at?: string
          metadata?: Json
          mobile?: string | null
          os_name?: string | null
          os_version?: string | null
          screen?: string | null
          seen_count?: number
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          app_version?: string | null
          browser?: string | null
          created_at?: string
          customer_id?: string | null
          device_model?: string | null
          fingerprint?: string
          first_seen_at?: string
          hardware_id?: string | null
          id?: string
          ip_address?: string | null
          language?: string | null
          last_seen_at?: string
          metadata?: Json
          mobile?: string | null
          os_name?: string | null
          os_version?: string | null
          screen?: string | null
          seen_count?: number
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      fraud_evaluations: {
        Row: {
          action: string
          campaign_id: string | null
          code: string | null
          created_at: string
          customer_id: string | null
          device_fingerprint: string | null
          event: string
          id: string
          ip_address: string | null
          lat: number | null
          lng: number | null
          matched_rules: Json
          metadata: Json
          mobile: string | null
          order_id: string | null
          score: number
        }
        Insert: {
          action?: string
          campaign_id?: string | null
          code?: string | null
          created_at?: string
          customer_id?: string | null
          device_fingerprint?: string | null
          event: string
          id?: string
          ip_address?: string | null
          lat?: number | null
          lng?: number | null
          matched_rules?: Json
          metadata?: Json
          mobile?: string | null
          order_id?: string | null
          score?: number
        }
        Update: {
          action?: string
          campaign_id?: string | null
          code?: string | null
          created_at?: string
          customer_id?: string | null
          device_fingerprint?: string | null
          event?: string
          id?: string
          ip_address?: string | null
          lat?: number | null
          lng?: number | null
          matched_rules?: Json
          metadata?: Json
          mobile?: string | null
          order_id?: string | null
          score?: number
        }
        Relationships: []
      }
      fraud_rate_limits: {
        Row: {
          action: string
          blocked_until: string | null
          hits: number
          id: string
          key: string
          updated_at: string
          window_seconds: number
          window_start: string
        }
        Insert: {
          action: string
          blocked_until?: string | null
          hits?: number
          id?: string
          key: string
          updated_at?: string
          window_seconds?: number
          window_start?: string
        }
        Update: {
          action?: string
          blocked_until?: string | null
          hits?: number
          id?: string
          key?: string
          updated_at?: string
          window_seconds?: number
          window_start?: string
        }
        Relationships: []
      }
      fraud_rules: {
        Row: {
          action: string
          category: string
          code: string
          config: Json
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          name: string
          priority: number
          score: number
          severity: string
          threshold: number
          updated_at: string
          window_seconds: number
        }
        Insert: {
          action?: string
          category?: string
          code: string
          config?: Json
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          name: string
          priority?: number
          score?: number
          severity?: string
          threshold?: number
          updated_at?: string
          window_seconds?: number
        }
        Update: {
          action?: string
          category?: string
          code?: string
          config?: Json
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          name?: string
          priority?: number
          score?: number
          severity?: string
          threshold?: number
          updated_at?: string
          window_seconds?: number
        }
        Relationships: []
      }
      homepage_analytics: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          event_type: string
          id: string
          metadata: Json | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          event_type?: string
          id?: string
          metadata?: Json | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      homepage_banners: {
        Row: {
          background_gradient: string | null
          clicks: number
          created_at: string
          cta_link: string | null
          cta_text: string | null
          display_order: number
          end_date: string | null
          festival_tag: string | null
          id: string
          impressions: number
          is_active: boolean
          media_type: string
          media_url: string | null
          mobile_media_url: string | null
          redirect_id: string | null
          redirect_type: string | null
          start_date: string | null
          subtitle: string | null
          theme_bg_color: string | null
          theme_button_color: string | null
          theme_header_color: string | null
          title: string
          updated_at: string
        }
        Insert: {
          background_gradient?: string | null
          clicks?: number
          created_at?: string
          cta_link?: string | null
          cta_text?: string | null
          display_order?: number
          end_date?: string | null
          festival_tag?: string | null
          id?: string
          impressions?: number
          is_active?: boolean
          media_type?: string
          media_url?: string | null
          mobile_media_url?: string | null
          redirect_id?: string | null
          redirect_type?: string | null
          start_date?: string | null
          subtitle?: string | null
          theme_bg_color?: string | null
          theme_button_color?: string | null
          theme_header_color?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          background_gradient?: string | null
          clicks?: number
          created_at?: string
          cta_link?: string | null
          cta_text?: string | null
          display_order?: number
          end_date?: string | null
          festival_tag?: string | null
          id?: string
          impressions?: number
          is_active?: boolean
          media_type?: string
          media_url?: string | null
          mobile_media_url?: string | null
          redirect_id?: string | null
          redirect_type?: string | null
          start_date?: string | null
          subtitle?: string | null
          theme_bg_color?: string | null
          theme_button_color?: string | null
          theme_header_color?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      homepage_layout_sections: {
        Row: {
          config: Json
          created_at: string
          display_order: number
          id: string
          is_visible: boolean
          layout_id: string
          title: string | null
          updated_at: string
          widget_type: string
        }
        Insert: {
          config?: Json
          created_at?: string
          display_order?: number
          id?: string
          is_visible?: boolean
          layout_id: string
          title?: string | null
          updated_at?: string
          widget_type: string
        }
        Update: {
          config?: Json
          created_at?: string
          display_order?: number
          id?: string
          is_visible?: boolean
          layout_id?: string
          title?: string | null
          updated_at?: string
          widget_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "homepage_layout_sections_layout_id_fkey"
            columns: ["layout_id"]
            isOneToOne: false
            referencedRelation: "homepage_layouts"
            referencedColumns: ["id"]
          },
        ]
      }
      homepage_layouts: {
        Row: {
          created_at: string
          has_unpublished_changes: boolean
          id: string
          is_active: boolean
          module: string
          name: string
          notes: string | null
          published_at: string | null
          published_by: string | null
          published_snapshot: Json | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          has_unpublished_changes?: boolean
          id?: string
          is_active?: boolean
          module: string
          name?: string
          notes?: string | null
          published_at?: string | null
          published_by?: string | null
          published_snapshot?: Json | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          has_unpublished_changes?: boolean
          id?: string
          is_active?: boolean
          module?: string
          name?: string
          notes?: string | null
          published_at?: string | null
          published_by?: string | null
          published_snapshot?: Json | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      homepage_section_items: {
        Row: {
          badge_text: string | null
          created_at: string
          display_order: number
          id: string
          image_url: string | null
          item_id: string | null
          item_type: string
          link: string | null
          section_id: string
          title: string | null
        }
        Insert: {
          badge_text?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string | null
          item_id?: string | null
          item_type?: string
          link?: string | null
          section_id: string
          title?: string | null
        }
        Update: {
          badge_text?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string | null
          item_id?: string | null
          item_type?: string
          link?: string | null
          section_id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "homepage_section_items_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "homepage_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      homepage_sections: {
        Row: {
          background_color: string | null
          background_gradient: string | null
          created_at: string
          cta_link: string | null
          cta_text: string | null
          display_order: number
          end_date: string | null
          festival_tag: string | null
          id: string
          is_visible: boolean
          metadata: Json | null
          section_type: string
          start_date: string | null
          target_location: string | null
          target_segment: string | null
          title: string
          updated_at: string
        }
        Insert: {
          background_color?: string | null
          background_gradient?: string | null
          created_at?: string
          cta_link?: string | null
          cta_text?: string | null
          display_order?: number
          end_date?: string | null
          festival_tag?: string | null
          id?: string
          is_visible?: boolean
          metadata?: Json | null
          section_type?: string
          start_date?: string | null
          target_location?: string | null
          target_segment?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          background_color?: string | null
          background_gradient?: string | null
          created_at?: string
          cta_link?: string | null
          cta_text?: string | null
          display_order?: number
          end_date?: string | null
          festival_tag?: string | null
          id?: string
          is_visible?: boolean
          metadata?: Json | null
          section_type?: string
          start_date?: string | null
          target_location?: string | null
          target_segment?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      homes_cms: {
        Row: {
          content: string | null
          content_type: string
          created_at: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          sort_order: number | null
          start_date: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          content_type: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          sort_order?: number | null
          start_date?: string | null
          title?: string
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          content_type?: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          sort_order?: number | null
          start_date?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      inventory_log: {
        Row: {
          change_qty: number
          created_at: string | null
          id: string
          new_qty: number | null
          performed_by: string | null
          previous_qty: number | null
          product_id: string
          reason: string | null
          variant_id: string | null
        }
        Insert: {
          change_qty?: number
          created_at?: string | null
          id?: string
          new_qty?: number | null
          performed_by?: string | null
          previous_qty?: number | null
          product_id: string
          reason?: string | null
          variant_id?: string | null
        }
        Update: {
          change_qty?: number
          created_at?: string | null
          id?: string
          new_qty?: number | null
          performed_by?: string | null
          previous_qty?: number | null
          product_id?: string
          reason?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_log_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_log_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_sequences: {
        Row: {
          doc_type: string
          fy_start: number
          id: string
          last_value: number
          prefix: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          doc_type: string
          fy_start: number
          id?: string
          last_value?: number
          prefix?: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          doc_type?: string
          fy_start?: number
          id?: string
          last_value?: number
          prefix?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: []
      }
      kyc_documents: {
        Row: {
          admin_notes: string | null
          back_image_url: string | null
          created_at: string
          document_number: string
          document_type: string
          front_image_url: string | null
          id: string
          rejection_reason: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          back_image_url?: string | null
          created_at?: string
          document_number?: string
          document_type?: string
          front_image_url?: string | null
          id?: string
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          back_image_url?: string | null
          created_at?: string
          document_number?: string
          document_type?: string
          front_image_url?: string | null
          id?: string
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      login_logs: {
        Row: {
          created_at: string
          id: string
          ip_address: string | null
          login_method: string
          portal: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address?: string | null
          login_method?: string
          portal?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: string | null
          login_method?: string
          portal?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      media_library: {
        Row: {
          alt_text: string | null
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string
          file_url: string
          folder: string | null
          id: string
          tags: string[] | null
          updated_at: string
          uploaded_by: string | null
          vendor_id: string | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string
          file_url: string
          folder?: string | null
          id?: string
          tags?: string[] | null
          updated_at?: string
          uploaded_by?: string | null
          vendor_id?: string | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          folder?: string | null
          id?: string
          tags?: string[] | null
          updated_at?: string
          uploaded_by?: string | null
          vendor_id?: string | null
        }
        Relationships: []
      }
      menu_categories: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          name: string
          restaurant_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          restaurant_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_categories_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_combos: {
        Row: {
          combo_price: number
          created_at: string
          description: string | null
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean
          item_ids: string[]
          name: string
          original_price: number
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          combo_price?: number
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          item_ids?: string[]
          name: string
          original_price?: number
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          combo_price?: number
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          item_ids?: string[]
          name?: string
          original_price?: number
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_combos_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_item_notify_requests: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          menu_item_id: string
          notified_at: string | null
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          menu_item_id: string
          notified_at?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          menu_item_id?: string
          notified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_notify_requests_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          addons: Json | null
          calories: number | null
          category_id: string | null
          created_at: string
          customizations: Json | null
          description: string | null
          dietary_tags: string[] | null
          discounted_price: number | null
          display_order: number
          gallery_urls: Json | null
          gst_rate: number
          id: string
          image_url: string | null
          in_stock: boolean
          is_bestseller: boolean
          is_veg: boolean
          name: string
          order_count: number | null
          prep_minutes: number | null
          price: number
          restaurant_id: string
          serves: number | null
          spice_level: string | null
          updated_at: string
        }
        Insert: {
          addons?: Json | null
          calories?: number | null
          category_id?: string | null
          created_at?: string
          customizations?: Json | null
          description?: string | null
          dietary_tags?: string[] | null
          discounted_price?: number | null
          display_order?: number
          gallery_urls?: Json | null
          gst_rate?: number
          id?: string
          image_url?: string | null
          in_stock?: boolean
          is_bestseller?: boolean
          is_veg?: boolean
          name: string
          order_count?: number | null
          prep_minutes?: number | null
          price: number
          restaurant_id: string
          serves?: number | null
          spice_level?: string | null
          updated_at?: string
        }
        Update: {
          addons?: Json | null
          calories?: number | null
          category_id?: string | null
          created_at?: string
          customizations?: Json | null
          description?: string | null
          dietary_tags?: string[] | null
          discounted_price?: number | null
          display_order?: number
          gallery_urls?: Json | null
          gst_rate?: number
          id?: string
          image_url?: string | null
          in_stock?: boolean
          is_bestseller?: boolean
          is_veg?: boolean
          name?: string
          order_count?: number | null
          prep_minutes?: number | null
          price?: number
          restaurant_id?: string
          serves?: number | null
          spice_level?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      message_backups: {
        Row: {
          content: string | null
          conversation_id: string
          deleted_at: string
          deleted_by: string
          id: string
          media_url: string | null
          message_type: string | null
          original_created_at: string
          original_message_id: string
          sender_id: string
        }
        Insert: {
          content?: string | null
          conversation_id: string
          deleted_at?: string
          deleted_by: string
          id?: string
          media_url?: string | null
          message_type?: string | null
          original_created_at: string
          original_message_id: string
          sender_id: string
        }
        Update: {
          content?: string | null
          conversation_id?: string
          deleted_at?: string
          deleted_by?: string
          id?: string
          media_url?: string | null
          message_type?: string | null
          original_created_at?: string
          original_message_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      occupations: {
        Row: {
          created_at: string
          customer_count: number
          id: string
          name: string
          status: string
        }
        Insert: {
          created_at?: string
          customer_count?: number
          id: string
          name: string
          status?: string
        }
        Update: {
          created_at?: string
          customer_count?: number
          id?: string
          name?: string
          status?: string
        }
        Relationships: []
      }
      odoo_config: {
        Row: {
          api_key_secret_name: string | null
          base_url: string | null
          created_at: string
          database_name: string | null
          default_warehouse_id: string | null
          id: number
          last_sync_at: string | null
          last_sync_status: string | null
          sync_customers: boolean
          sync_inventory: boolean
          sync_orders: boolean
          sync_shipments: boolean
          updated_at: string
          username: string | null
        }
        Insert: {
          api_key_secret_name?: string | null
          base_url?: string | null
          created_at?: string
          database_name?: string | null
          default_warehouse_id?: string | null
          id?: number
          last_sync_at?: string | null
          last_sync_status?: string | null
          sync_customers?: boolean
          sync_inventory?: boolean
          sync_orders?: boolean
          sync_shipments?: boolean
          updated_at?: string
          username?: string | null
        }
        Update: {
          api_key_secret_name?: string | null
          base_url?: string | null
          created_at?: string
          database_name?: string | null
          default_warehouse_id?: string | null
          id?: number
          last_sync_at?: string | null
          last_sync_status?: string | null
          sync_customers?: boolean
          sync_inventory?: boolean
          sync_orders?: boolean
          sync_shipments?: boolean
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      odoo_sync_log: {
        Row: {
          completed_at: string | null
          created_at: string
          direction: string
          entity_id: string
          entity_type: string
          error_message: string | null
          id: string
          odoo_record_id: string | null
          payload: Json | null
          response: Json | null
          retry_count: number
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          direction?: string
          entity_id: string
          entity_type: string
          error_message?: string | null
          id?: string
          odoo_record_id?: string | null
          payload?: Json | null
          response?: Json | null
          retry_count?: number
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          direction?: string
          entity_id?: string
          entity_type?: string
          error_message?: string | null
          id?: string
          odoo_record_id?: string | null
          payload?: Json | null
          response?: Json | null
          retry_count?: number
          status?: string
        }
        Relationships: []
      }
      onboarding_screens: {
        Row: {
          created_at: string
          description: string
          display_order: number
          id: string
          image_url: string
          is_active: boolean
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          display_order?: number
          id?: string
          image_url?: string
          is_active?: boolean
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          display_order?: number
          id?: string
          image_url?: string
          is_active?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_invoices: {
        Row: {
          amount_in_words: string | null
          cancelled_at: string | null
          cess_amount: number
          cgst_amount: number
          created_at: string
          customer_address: string | null
          customer_email: string | null
          customer_id: string
          customer_name: string | null
          customer_phone: string | null
          discount: number
          emailed_at: string | null
          fy_start: number
          id: string
          igst_amount: number
          invoice_date: string
          invoice_no: string
          is_interstate: boolean
          items: Json
          metadata: Json | null
          notes: string | null
          order_id: string
          pdf_url: string | null
          place_of_supply_code: string | null
          place_of_supply_state: string | null
          round_off: number
          sgst_amount: number
          taxable_value: number
          tcs_amount: number
          total_amount: number
          updated_at: string
          vendor_address: string | null
          vendor_gstin: string | null
          vendor_id: string
          vendor_name: string | null
          vendor_pan: string | null
          vendor_state: string | null
          vendor_state_code: string | null
        }
        Insert: {
          amount_in_words?: string | null
          cancelled_at?: string | null
          cess_amount?: number
          cgst_amount?: number
          created_at?: string
          customer_address?: string | null
          customer_email?: string | null
          customer_id: string
          customer_name?: string | null
          customer_phone?: string | null
          discount?: number
          emailed_at?: string | null
          fy_start: number
          id?: string
          igst_amount?: number
          invoice_date?: string
          invoice_no: string
          is_interstate?: boolean
          items?: Json
          metadata?: Json | null
          notes?: string | null
          order_id: string
          pdf_url?: string | null
          place_of_supply_code?: string | null
          place_of_supply_state?: string | null
          round_off?: number
          sgst_amount?: number
          taxable_value?: number
          tcs_amount?: number
          total_amount?: number
          updated_at?: string
          vendor_address?: string | null
          vendor_gstin?: string | null
          vendor_id: string
          vendor_name?: string | null
          vendor_pan?: string | null
          vendor_state?: string | null
          vendor_state_code?: string | null
        }
        Update: {
          amount_in_words?: string | null
          cancelled_at?: string | null
          cess_amount?: number
          cgst_amount?: number
          created_at?: string
          customer_address?: string | null
          customer_email?: string | null
          customer_id?: string
          customer_name?: string | null
          customer_phone?: string | null
          discount?: number
          emailed_at?: string | null
          fy_start?: number
          id?: string
          igst_amount?: number
          invoice_date?: string
          invoice_no?: string
          is_interstate?: boolean
          items?: Json
          metadata?: Json | null
          notes?: string | null
          order_id?: string
          pdf_url?: string | null
          place_of_supply_code?: string | null
          place_of_supply_state?: string | null
          round_off?: number
          sgst_amount?: number
          taxable_value?: number
          tcs_amount?: number
          total_amount?: number
          updated_at?: string
          vendor_address?: string | null
          vendor_gstin?: string | null
          vendor_id?: string
          vendor_name?: string | null
          vendor_pan?: string | null
          vendor_state?: string | null
          vendor_state_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          customer_id: string
          failure_reason: string | null
          gateway_fee: number | null
          gateway_gst: number | null
          id: string
          metadata: Json | null
          order_id: string
          payment_method: string | null
          payment_provider: string
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          razorpay_refund_id: string | null
          razorpay_signature: string | null
          status: string
          txn_type: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          customer_id: string
          failure_reason?: string | null
          gateway_fee?: number | null
          gateway_gst?: number | null
          id?: string
          metadata?: Json | null
          order_id: string
          payment_method?: string | null
          payment_provider?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_refund_id?: string | null
          razorpay_signature?: string | null
          status?: string
          txn_type?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          customer_id?: string
          failure_reason?: string | null
          gateway_fee?: number | null
          gateway_gst?: number | null
          id?: string
          metadata?: Json | null
          order_id?: string
          payment_method?: string | null
          payment_provider?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_refund_id?: string | null
          razorpay_signature?: string | null
          status?: string
          txn_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_refunds: {
        Row: {
          amount: number
          completed_at: string | null
          credit_note_id: string | null
          customer_id: string
          id: string
          initiated_at: string
          initiated_by: string | null
          metadata: Json | null
          notes: string | null
          order_id: string
          razorpay_refund_id: string | null
          reason: string
          refund_method: string
          status: string
        }
        Insert: {
          amount: number
          completed_at?: string | null
          credit_note_id?: string | null
          customer_id: string
          id?: string
          initiated_at?: string
          initiated_by?: string | null
          metadata?: Json | null
          notes?: string | null
          order_id: string
          razorpay_refund_id?: string | null
          reason?: string
          refund_method?: string
          status?: string
        }
        Update: {
          amount?: number
          completed_at?: string | null
          credit_note_id?: string | null
          customer_id?: string
          id?: string
          initiated_at?: string
          initiated_by?: string | null
          metadata?: Json | null
          notes?: string | null
          order_id?: string
          razorpay_refund_id?: string | null
          reason?: string
          refund_method?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_refunds_credit_note_id_fkey"
            columns: ["credit_note_id"]
            isOneToOne: false
            referencedRelation: "credit_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_refunds_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          applied_cart_rules: Json
          cart_rule_discount: number
          cgst_amount: number | null
          commission_source: string | null
          country_code: string
          coupon_campaign_id: string | null
          coupon_code: string | null
          coupon_discount: number
          coupon_snapshot: Json | null
          courier_name: string | null
          created_at: string
          currency_code: string
          customer_id: string
          customer_name: string | null
          customer_notes: string | null
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          delivery_rating: number | null
          discount: number
          effective_commission: number | null
          effective_max_redemption: number | null
          gst_on_platform_fee: number | null
          id: string
          igst_amount: number | null
          invoice_no: string | null
          is_interstate: boolean | null
          items: Json | null
          payment_reference_id: string | null
          place_of_supply_code: string | null
          place_of_supply_state: string | null
          platform_fee: number | null
          pod_confirmed: boolean | null
          pod_confirmed_at: string | null
          points_used: number
          rated_at: string | null
          rating_comment: string | null
          razorpay_order_id: string | null
          redemption_source: string | null
          sgst_amount: number | null
          shipping_notes: string | null
          shipping_type: string | null
          status: string
          subtotal: number
          tax: number
          taxable_value: number | null
          tcs_amount: number | null
          total: number
          tracking_number: string | null
          tracking_url: string | null
          updated_at: string
          vendor_gstin: string | null
          vendor_id: string
          vendor_name: string | null
          vendor_state: string | null
        }
        Insert: {
          applied_cart_rules?: Json
          cart_rule_discount?: number
          cgst_amount?: number | null
          commission_source?: string | null
          country_code?: string
          coupon_campaign_id?: string | null
          coupon_code?: string | null
          coupon_discount?: number
          coupon_snapshot?: Json | null
          courier_name?: string | null
          created_at?: string
          currency_code?: string
          customer_id: string
          customer_name?: string | null
          customer_notes?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          delivery_rating?: number | null
          discount?: number
          effective_commission?: number | null
          effective_max_redemption?: number | null
          gst_on_platform_fee?: number | null
          id: string
          igst_amount?: number | null
          invoice_no?: string | null
          is_interstate?: boolean | null
          items?: Json | null
          payment_reference_id?: string | null
          place_of_supply_code?: string | null
          place_of_supply_state?: string | null
          platform_fee?: number | null
          pod_confirmed?: boolean | null
          pod_confirmed_at?: string | null
          points_used?: number
          rated_at?: string | null
          rating_comment?: string | null
          razorpay_order_id?: string | null
          redemption_source?: string | null
          sgst_amount?: number | null
          shipping_notes?: string | null
          shipping_type?: string | null
          status?: string
          subtotal?: number
          tax?: number
          taxable_value?: number | null
          tcs_amount?: number | null
          total?: number
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
          vendor_gstin?: string | null
          vendor_id: string
          vendor_name?: string | null
          vendor_state?: string | null
        }
        Update: {
          applied_cart_rules?: Json
          cart_rule_discount?: number
          cgst_amount?: number | null
          commission_source?: string | null
          country_code?: string
          coupon_campaign_id?: string | null
          coupon_code?: string | null
          coupon_discount?: number
          coupon_snapshot?: Json | null
          courier_name?: string | null
          created_at?: string
          currency_code?: string
          customer_id?: string
          customer_name?: string | null
          customer_notes?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          delivery_rating?: number | null
          discount?: number
          effective_commission?: number | null
          effective_max_redemption?: number | null
          gst_on_platform_fee?: number | null
          id?: string
          igst_amount?: number | null
          invoice_no?: string | null
          is_interstate?: boolean | null
          items?: Json | null
          payment_reference_id?: string | null
          place_of_supply_code?: string | null
          place_of_supply_state?: string | null
          platform_fee?: number | null
          pod_confirmed?: boolean | null
          pod_confirmed_at?: string | null
          points_used?: number
          rated_at?: string | null
          rating_comment?: string | null
          razorpay_order_id?: string | null
          redemption_source?: string | null
          sgst_amount?: number | null
          shipping_notes?: string | null
          shipping_type?: string | null
          status?: string
          subtotal?: number
          tax?: number
          taxable_value?: number | null
          tcs_amount?: number | null
          total?: number
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
          vendor_gstin?: string | null
          vendor_id?: string
          vendor_name?: string | null
          vendor_state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_coupon_campaign_id_fkey"
            columns: ["coupon_campaign_id"]
            isOneToOne: false
            referencedRelation: "coupon_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      otp_requests: {
        Row: {
          last_requested_at: string
          phone_number: string
          request_count: number
        }
        Insert: {
          last_requested_at?: string
          phone_number: string
          request_count?: number
        }
        Update: {
          last_requested_at?: string
          phone_number?: string
          request_count?: number
        }
        Relationships: []
      }
      parent_items: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_fee_invoices: {
        Row: {
          bill_to: string
          cgst_amount: number
          created_at: string
          description: string
          fy_start: number
          gst_rate: number
          id: string
          igst_amount: number
          invoice_date: string
          invoice_no: string
          is_interstate: boolean
          order_id: string
          pdf_url: string | null
          recipient_gstin: string | null
          recipient_id: string
          recipient_name: string | null
          recipient_state_code: string | null
          sac_code: string
          sgst_amount: number
          taxable_value: number
          total_amount: number
        }
        Insert: {
          bill_to?: string
          cgst_amount?: number
          created_at?: string
          description?: string
          fy_start: number
          gst_rate?: number
          id?: string
          igst_amount?: number
          invoice_date?: string
          invoice_no: string
          is_interstate?: boolean
          order_id: string
          pdf_url?: string | null
          recipient_gstin?: string | null
          recipient_id: string
          recipient_name?: string | null
          recipient_state_code?: string | null
          sac_code?: string
          sgst_amount?: number
          taxable_value?: number
          total_amount?: number
        }
        Update: {
          bill_to?: string
          cgst_amount?: number
          created_at?: string
          description?: string
          fy_start?: number
          gst_rate?: number
          id?: string
          igst_amount?: number
          invoice_date?: string
          invoice_no?: string
          is_interstate?: boolean
          order_id?: string
          pdf_url?: string | null
          recipient_gstin?: string | null
          recipient_id?: string
          recipient_name?: string | null
          recipient_state_code?: string | null
          sac_code?: string
          sgst_amount?: number
          taxable_value?: number
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "platform_fee_invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          active_country_code: string
          config: Json
          dropshipping_enabled: boolean
          id: number
          last_country_switched_at: string | null
          last_country_switched_by: string | null
          multi_currency_display: boolean
          odoo_enabled: boolean
          odoo_integration_enabled: boolean
          updated_at: string
        }
        Insert: {
          active_country_code?: string
          config?: Json
          dropshipping_enabled?: boolean
          id?: number
          last_country_switched_at?: string | null
          last_country_switched_by?: string | null
          multi_currency_display?: boolean
          odoo_enabled?: boolean
          odoo_integration_enabled?: boolean
          updated_at?: string
        }
        Update: {
          active_country_code?: string
          config?: Json
          dropshipping_enabled?: boolean
          id?: number
          last_country_switched_at?: string | null
          last_country_switched_by?: string | null
          multi_currency_display?: boolean
          odoo_enabled?: boolean
          odoo_integration_enabled?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_settings_active_country_code_fkey"
            columns: ["active_country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
        ]
      }
      platform_variables: {
        Row: {
          description: string
          id: string
          key: string
          value: string
        }
        Insert: {
          description?: string
          id: string
          key: string
          value?: string
        }
        Update: {
          description?: string
          id?: string
          key?: string
          value?: string
        }
        Relationships: []
      }
      points_transactions: {
        Row: {
          cooling_status: string
          created_at: string
          dedupe_key: string | null
          description: string
          expires_at: string | null
          id: string
          is_expired: boolean
          points: number
          type: string
          user_id: string
          user_name: string | null
        }
        Insert: {
          cooling_status?: string
          created_at?: string
          dedupe_key?: string | null
          description?: string
          expires_at?: string | null
          id: string
          is_expired?: boolean
          points?: number
          type: string
          user_id: string
          user_name?: string | null
        }
        Update: {
          cooling_status?: string
          created_at?: string
          dedupe_key?: string | null
          description?: string
          expires_at?: string | null
          id?: string
          is_expired?: boolean
          points?: number
          type?: string
          user_id?: string
          user_name?: string | null
        }
        Relationships: []
      }
      popup_banners: {
        Row: {
          created_at: string
          description: string
          end_date: string
          id: string
          image: string
          link: string
          start_date: string
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string
          end_date?: string
          id: string
          image?: string
          link?: string
          start_date?: string
          status?: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string
          end_date?: string
          id?: string
          image?: string
          link?: string
          start_date?: string
          status?: string
          title?: string
        }
        Relationships: []
      }
      product_attribute_map: {
        Row: {
          attribute_id: string
          created_at: string | null
          id: string
          product_id: string
        }
        Insert: {
          attribute_id: string
          created_at?: string | null
          id?: string
          product_id: string
        }
        Update: {
          attribute_id?: string
          created_at?: string | null
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_attribute_map_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "product_attributes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_attribute_map_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_attribute_values: {
        Row: {
          attribute_id: string
          created_at: string | null
          display_label: string | null
          hex_color: string | null
          id: string
          sort_order: number | null
          value: string
        }
        Insert: {
          attribute_id: string
          created_at?: string | null
          display_label?: string | null
          hex_color?: string | null
          id?: string
          sort_order?: number | null
          value: string
        }
        Update: {
          attribute_id?: string
          created_at?: string | null
          display_label?: string | null
          hex_color?: string | null
          id?: string
          sort_order?: number | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_attribute_values_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "product_attributes"
            referencedColumns: ["id"]
          },
        ]
      }
      product_attributes: {
        Row: {
          attribute_type: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          attribute_type?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          attribute_type?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      product_variant_images: {
        Row: {
          created_at: string | null
          id: string
          image_url: string
          is_primary: boolean | null
          sort_order: number | null
          variant_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url: string
          is_primary?: boolean | null
          sort_order?: number | null
          variant_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string
          is_primary?: boolean | null
          sort_order?: number | null
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variant_images_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          compare_at_price: number | null
          created_at: string | null
          dimensions: Json | null
          id: string
          image_url: string | null
          is_active: boolean
          price: number
          product_id: string
          sku: string | null
          sort_order: number | null
          stock_quantity: number
          stock_status: string
          updated_at: string | null
          variant_attributes: Json
          weight: number | null
        }
        Insert: {
          compare_at_price?: number | null
          created_at?: string | null
          dimensions?: Json | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          price?: number
          product_id: string
          sku?: string | null
          sort_order?: number | null
          stock_quantity?: number
          stock_status?: string
          updated_at?: string | null
          variant_attributes?: Json
          weight?: number | null
        }
        Update: {
          compare_at_price?: number | null
          created_at?: string | null
          dimensions?: Json | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          price?: number
          product_id?: string
          sku?: string | null
          sort_order?: number | null
          stock_quantity?: number
          stock_status?: string
          updated_at?: string | null
          variant_attributes?: Json
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          banner_image: string | null
          category_id: string | null
          category_name: string | null
          commission_override: number | null
          country_code: string
          created_at: string
          currency_code: string
          description: string
          dimensions: Json | null
          discount: number
          discount_type: string | null
          duration_hours: number | null
          duration_minutes: number | null
          emoji: string | null
          gst_rate: number | null
          helpline_number: string | null
          hsn_code: string | null
          id: string
          image: string | null
          images: Json | null
          inactivation_reason: string | null
          is_available: boolean | null
          is_deal_of_day: boolean
          long_description: string | null
          manage_stock: boolean | null
          max_points_redeemable: number
          max_redemption_percentage: number | null
          meta_description: string | null
          meta_title: string | null
          parent_item_id: string | null
          parent_item_name: string | null
          price: number
          product_attributes: Json | null
          product_type: string
          promise_p4u: string | null
          rating: number | null
          rejection_reason: string | null
          replacement_time: string | null
          reviews: number | null
          sac_code: string | null
          sales: number | null
          short_description: string | null
          sku: string | null
          slug: string | null
          socio_shopping_icon: string | null
          sold_count: number
          status: string
          stock: number | null
          stock_status: string | null
          subcategory_id: string | null
          subcategory_name: string | null
          tax: number
          tax_slab_id: string | null
          thumbnail_image: string | null
          title: string
          updated_at: string
          uqc: string | null
          vendor_id: string
          vendor_name: string | null
          weight: number | null
          youtube_video_url: string | null
        }
        Insert: {
          banner_image?: string | null
          category_id?: string | null
          category_name?: string | null
          commission_override?: number | null
          country_code?: string
          created_at?: string
          currency_code?: string
          description?: string
          dimensions?: Json | null
          discount?: number
          discount_type?: string | null
          duration_hours?: number | null
          duration_minutes?: number | null
          emoji?: string | null
          gst_rate?: number | null
          helpline_number?: string | null
          hsn_code?: string | null
          id: string
          image?: string | null
          images?: Json | null
          inactivation_reason?: string | null
          is_available?: boolean | null
          is_deal_of_day?: boolean
          long_description?: string | null
          manage_stock?: boolean | null
          max_points_redeemable?: number
          max_redemption_percentage?: number | null
          meta_description?: string | null
          meta_title?: string | null
          parent_item_id?: string | null
          parent_item_name?: string | null
          price?: number
          product_attributes?: Json | null
          product_type?: string
          promise_p4u?: string | null
          rating?: number | null
          rejection_reason?: string | null
          replacement_time?: string | null
          reviews?: number | null
          sac_code?: string | null
          sales?: number | null
          short_description?: string | null
          sku?: string | null
          slug?: string | null
          socio_shopping_icon?: string | null
          sold_count?: number
          status?: string
          stock?: number | null
          stock_status?: string | null
          subcategory_id?: string | null
          subcategory_name?: string | null
          tax?: number
          tax_slab_id?: string | null
          thumbnail_image?: string | null
          title: string
          updated_at?: string
          uqc?: string | null
          vendor_id: string
          vendor_name?: string | null
          weight?: number | null
          youtube_video_url?: string | null
        }
        Update: {
          banner_image?: string | null
          category_id?: string | null
          category_name?: string | null
          commission_override?: number | null
          country_code?: string
          created_at?: string
          currency_code?: string
          description?: string
          dimensions?: Json | null
          discount?: number
          discount_type?: string | null
          duration_hours?: number | null
          duration_minutes?: number | null
          emoji?: string | null
          gst_rate?: number | null
          helpline_number?: string | null
          hsn_code?: string | null
          id?: string
          image?: string | null
          images?: Json | null
          inactivation_reason?: string | null
          is_available?: boolean | null
          is_deal_of_day?: boolean
          long_description?: string | null
          manage_stock?: boolean | null
          max_points_redeemable?: number
          max_redemption_percentage?: number | null
          meta_description?: string | null
          meta_title?: string | null
          parent_item_id?: string | null
          parent_item_name?: string | null
          price?: number
          product_attributes?: Json | null
          product_type?: string
          promise_p4u?: string | null
          rating?: number | null
          rejection_reason?: string | null
          replacement_time?: string | null
          reviews?: number | null
          sac_code?: string | null
          sales?: number | null
          short_description?: string | null
          sku?: string | null
          slug?: string | null
          socio_shopping_icon?: string | null
          sold_count?: number
          status?: string
          stock?: number | null
          stock_status?: string | null
          subcategory_id?: string | null
          subcategory_name?: string | null
          tax?: number
          tax_slab_id?: string | null
          thumbnail_image?: string | null
          title?: string
          updated_at?: string
          uqc?: string | null
          vendor_id?: string
          vendor_name?: string | null
          weight?: number | null
          youtube_video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_parent_item_id_fkey"
            columns: ["parent_item_id"]
            isOneToOne: false
            referencedRelation: "parent_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_tax_slab_id_fkey"
            columns: ["tax_slab_id"]
            isOneToOne: false
            referencedRelation: "tax_slabs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          mobile: string | null
          name: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id: string
          mobile?: string | null
          name?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          mobile?: string | null
          name?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          age_of_property: string | null
          amenities: Json | null
          area_sqft: number | null
          availability_date: string | null
          bhk: string | null
          boost_expires_at: string | null
          city: string | null
          contact_reveals: number | null
          created_at: string
          description: string | null
          enquiry_count: number | null
          facing: Database["public"]["Enums"]["property_facing"] | null
          floor_number: number | null
          furnishing: Database["public"]["Enums"]["property_furnishing"] | null
          id: string
          images: Json | null
          is_boosted: boolean | null
          is_featured: boolean | null
          is_verified: boolean | null
          landmark: string | null
          latitude: number | null
          locality: string | null
          longitude: number | null
          maintenance_charges: number | null
          parking: Database["public"]["Enums"]["property_parking"] | null
          pg_facilities: Json | null
          pg_gender_preference: string | null
          pg_meals_included: Json | null
          pg_room_type: string | null
          pg_rules: Json | null
          pincode: string | null
          posted_by: Database["public"]["Enums"]["property_posted_by"]
          preferred_tenant: string | null
          price: number
          price_negotiable: boolean | null
          property_type: Database["public"]["Enums"]["property_type"]
          rejection_reason: string | null
          security_deposit: number | null
          status: Database["public"]["Enums"]["property_status"]
          title: string
          total_floors: number | null
          transaction_type: Database["public"]["Enums"]["property_transaction_type"]
          updated_at: string
          user_id: string
          user_name: string | null
          video_url: string | null
          views_count: number | null
          virtual_tour_url: string | null
        }
        Insert: {
          age_of_property?: string | null
          amenities?: Json | null
          area_sqft?: number | null
          availability_date?: string | null
          bhk?: string | null
          boost_expires_at?: string | null
          city?: string | null
          contact_reveals?: number | null
          created_at?: string
          description?: string | null
          enquiry_count?: number | null
          facing?: Database["public"]["Enums"]["property_facing"] | null
          floor_number?: number | null
          furnishing?: Database["public"]["Enums"]["property_furnishing"] | null
          id: string
          images?: Json | null
          is_boosted?: boolean | null
          is_featured?: boolean | null
          is_verified?: boolean | null
          landmark?: string | null
          latitude?: number | null
          locality?: string | null
          longitude?: number | null
          maintenance_charges?: number | null
          parking?: Database["public"]["Enums"]["property_parking"] | null
          pg_facilities?: Json | null
          pg_gender_preference?: string | null
          pg_meals_included?: Json | null
          pg_room_type?: string | null
          pg_rules?: Json | null
          pincode?: string | null
          posted_by?: Database["public"]["Enums"]["property_posted_by"]
          preferred_tenant?: string | null
          price?: number
          price_negotiable?: boolean | null
          property_type?: Database["public"]["Enums"]["property_type"]
          rejection_reason?: string | null
          security_deposit?: number | null
          status?: Database["public"]["Enums"]["property_status"]
          title: string
          total_floors?: number | null
          transaction_type?: Database["public"]["Enums"]["property_transaction_type"]
          updated_at?: string
          user_id: string
          user_name?: string | null
          video_url?: string | null
          views_count?: number | null
          virtual_tour_url?: string | null
        }
        Update: {
          age_of_property?: string | null
          amenities?: Json | null
          area_sqft?: number | null
          availability_date?: string | null
          bhk?: string | null
          boost_expires_at?: string | null
          city?: string | null
          contact_reveals?: number | null
          created_at?: string
          description?: string | null
          enquiry_count?: number | null
          facing?: Database["public"]["Enums"]["property_facing"] | null
          floor_number?: number | null
          furnishing?: Database["public"]["Enums"]["property_furnishing"] | null
          id?: string
          images?: Json | null
          is_boosted?: boolean | null
          is_featured?: boolean | null
          is_verified?: boolean | null
          landmark?: string | null
          latitude?: number | null
          locality?: string | null
          longitude?: number | null
          maintenance_charges?: number | null
          parking?: Database["public"]["Enums"]["property_parking"] | null
          pg_facilities?: Json | null
          pg_gender_preference?: string | null
          pg_meals_included?: Json | null
          pg_room_type?: string | null
          pg_rules?: Json | null
          pincode?: string | null
          posted_by?: Database["public"]["Enums"]["property_posted_by"]
          preferred_tenant?: string | null
          price?: number
          price_negotiable?: boolean | null
          property_type?: Database["public"]["Enums"]["property_type"]
          rejection_reason?: string | null
          security_deposit?: number | null
          status?: Database["public"]["Enums"]["property_status"]
          title?: string
          total_floors?: number | null
          transaction_type?: Database["public"]["Enums"]["property_transaction_type"]
          updated_at?: string
          user_id?: string
          user_name?: string | null
          video_url?: string | null
          views_count?: number | null
          virtual_tour_url?: string | null
        }
        Relationships: []
      }
      property_amenities: {
        Row: {
          category: string | null
          created_at: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      property_bookmarks: {
        Row: {
          created_at: string
          id: string
          property_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          property_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          property_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_bookmarks_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_enquiries: {
        Row: {
          created_at: string
          id: string
          message: string | null
          property_id: string
          seeker_id: string
          seeker_name: string | null
          seeker_phone: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          property_id: string
          seeker_id: string
          seeker_name?: string | null
          seeker_phone?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          property_id?: string
          seeker_id?: string
          seeker_name?: string | null
          seeker_phone?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_enquiries_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_filter_options: {
        Row: {
          created_at: string | null
          filter_type: string
          id: string
          is_active: boolean | null
          label: string
          sort_order: number | null
          value: string
        }
        Insert: {
          created_at?: string | null
          filter_type: string
          id?: string
          is_active?: boolean | null
          label: string
          sort_order?: number | null
          value: string
        }
        Update: {
          created_at?: string | null
          filter_type?: string
          id?: string
          is_active?: boolean | null
          label?: string
          sort_order?: number | null
          value?: string
        }
        Relationships: []
      }
      property_localities: {
        Row: {
          avg_rent: number | null
          avg_sale_price: number | null
          city: string
          created_at: string
          id: string
          is_popular: boolean | null
          life_score: Json | null
          name: string
          seo_description: string | null
          seo_title: string | null
          status: string
        }
        Insert: {
          avg_rent?: number | null
          avg_sale_price?: number | null
          city: string
          created_at?: string
          id?: string
          is_popular?: boolean | null
          life_score?: Json | null
          name: string
          seo_description?: string | null
          seo_title?: string | null
          status?: string
        }
        Update: {
          avg_rent?: number | null
          avg_sale_price?: number | null
          city?: string
          created_at?: string
          id?: string
          is_popular?: boolean | null
          life_score?: Json | null
          name?: string
          seo_description?: string | null
          seo_title?: string | null
          status?: string
        }
        Relationships: []
      }
      property_messages: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          property_id: string
          receiver_id: string
          sender_id: string
          sender_name: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          property_id: string
          receiver_id: string
          sender_id: string
          sender_name?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          property_id?: string
          receiver_id?: string
          sender_id?: string
          sender_name?: string | null
        }
        Relationships: []
      }
      property_plans: {
        Row: {
          contact_reveal_limit: number
          created_at: string
          description: string | null
          duration_days: number
          features: Json | null
          id: string
          is_active: boolean | null
          listing_limit: number
          name: string
          plan_type: string | null
          price: number
          visibility_boost: boolean | null
        }
        Insert: {
          contact_reveal_limit?: number
          created_at?: string
          description?: string | null
          duration_days?: number
          features?: Json | null
          id: string
          is_active?: boolean | null
          listing_limit?: number
          name: string
          plan_type?: string | null
          price?: number
          visibility_boost?: boolean | null
        }
        Update: {
          contact_reveal_limit?: number
          created_at?: string
          description?: string | null
          duration_days?: number
          features?: Json | null
          id?: string
          is_active?: boolean | null
          listing_limit?: number
          name?: string
          plan_type?: string | null
          price?: number
          visibility_boost?: boolean | null
        }
        Relationships: []
      }
      property_reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          property_id: string
          reason: string
          reporter_id: string
          status: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          property_id: string
          reason?: string
          reporter_id: string
          status?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          property_id?: string
          reason?: string
          reporter_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_reports_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_visits: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          property_id: string
          seeker_id: string
          seeker_name: string | null
          status: string
          visit_date: string
          visit_time: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          property_id: string
          seeker_id: string
          seeker_name?: string | null
          status?: string
          visit_date: string
          visit_time?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          property_id?: string
          seeker_id?: string
          seeker_name?: string | null
          status?: string
          visit_date?: string
          visit_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_visits_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          bonus_credited: boolean
          cooling_until: string | null
          created_at: string
          first_order_placed: boolean
          id: string
          points_awarded: number
          referee_id: string
          referee_name: string | null
          referrer_id: string
          referrer_name: string | null
          status: string
        }
        Insert: {
          bonus_credited?: boolean
          cooling_until?: string | null
          created_at?: string
          first_order_placed?: boolean
          id: string
          points_awarded?: number
          referee_id: string
          referee_name?: string | null
          referrer_id: string
          referrer_name?: string | null
          status?: string
        }
        Update: {
          bonus_credited?: boolean
          cooling_until?: string | null
          created_at?: string
          first_order_placed?: boolean
          id?: string
          points_awarded?: number
          referee_id?: string
          referee_name?: string | null
          referrer_id?: string
          referrer_name?: string | null
          status?: string
        }
        Relationships: []
      }
      rent_payments: {
        Row: {
          created_at: string
          due_date: number
          id: string
          landlord_name: string | null
          landlord_phone: string | null
          monthly_rent: number
          paid_months: Json
          property_title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          due_date?: number
          id?: string
          landlord_name?: string | null
          landlord_phone?: string | null
          monthly_rent?: number
          paid_months?: Json
          property_title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          due_date?: number
          id?: string
          landlord_name?: string | null
          landlord_phone?: string | null
          monthly_rent?: number
          paid_months?: Json
          property_title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      report_log: {
        Row: {
          created_at: string
          file_size: string
          format: string
          generated_by: string
          id: string
          report_type: string
          status: string
        }
        Insert: {
          created_at?: string
          file_size?: string
          format?: string
          generated_by?: string
          id: string
          report_type: string
          status?: string
        }
        Update: {
          created_at?: string
          file_size?: string
          format?: string
          generated_by?: string
          id?: string
          report_type?: string
          status?: string
        }
        Relationships: []
      }
      restaurants: {
        Row: {
          address: string
          area_id: string | null
          avg_prep_minutes: number
          banner_url: string | null
          city_id: string | null
          closing_time: string | null
          commission_rate: number
          cover_image: string | null
          created_at: string
          cuisine: string[] | null
          delivery_radius_km: number
          description: string | null
          email: string | null
          fssai_expiry: string | null
          fssai_license: string | null
          gallery_urls: Json | null
          id: string
          is_active: boolean
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          min_order_amount: number
          name: string
          open_days: number[] | null
          opening_time: string | null
          packaging_fee: number
          phone: string | null
          rating: number
          reviews_count: number
          status: string
          tagline: string | null
          total_orders: number
          updated_at: string
          veg_only: boolean
          vendor_id: string | null
        }
        Insert: {
          address: string
          area_id?: string | null
          avg_prep_minutes?: number
          banner_url?: string | null
          city_id?: string | null
          closing_time?: string | null
          commission_rate?: number
          cover_image?: string | null
          created_at?: string
          cuisine?: string[] | null
          delivery_radius_km?: number
          description?: string | null
          email?: string | null
          fssai_expiry?: string | null
          fssai_license?: string | null
          gallery_urls?: Json | null
          id: string
          is_active?: boolean
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          min_order_amount?: number
          name: string
          open_days?: number[] | null
          opening_time?: string | null
          packaging_fee?: number
          phone?: string | null
          rating?: number
          reviews_count?: number
          status?: string
          tagline?: string | null
          total_orders?: number
          updated_at?: string
          veg_only?: boolean
          vendor_id?: string | null
        }
        Update: {
          address?: string
          area_id?: string | null
          avg_prep_minutes?: number
          banner_url?: string | null
          city_id?: string | null
          closing_time?: string | null
          commission_rate?: number
          cover_image?: string | null
          created_at?: string
          cuisine?: string[] | null
          delivery_radius_km?: number
          description?: string | null
          email?: string | null
          fssai_expiry?: string | null
          fssai_license?: string | null
          gallery_urls?: Json | null
          id?: string
          is_active?: boolean
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          min_order_amount?: number
          name?: string
          open_days?: number[] | null
          opening_time?: string | null
          packaging_fee?: number
          phone?: string | null
          rating?: number
          reviews_count?: number
          status?: string
          tagline?: string | null
          total_orders?: number
          updated_at?: string
          veg_only?: boolean
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurants_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurants_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurants_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          booking_id: string | null
          comment: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          order_id: string | null
          rating: number
          status: string
          updated_at: string
          user_id: string
          user_name: string | null
        }
        Insert: {
          booking_id?: string | null
          comment?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          order_id?: string | null
          rating: number
          status?: string
          updated_at?: string
          user_id: string
          user_name?: string | null
        }
        Update: {
          booking_id?: string | null
          comment?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          order_id?: string | null
          rating?: number
          status?: string
          updated_at?: string
          user_id?: string
          user_name?: string | null
        }
        Relationships: []
      }
      rider_assignments: {
        Row: {
          base_payout: number
          batch_id: string | null
          delivered_at: string | null
          distance_km: number | null
          distance_payout: number
          drop_address: string | null
          drop_lat: number | null
          drop_lng: number | null
          id: string
          offered_at: string
          order_id: string
          payout_amount: number
          picked_up_at: string | null
          pickup_address: string | null
          pickup_lat: number | null
          pickup_lng: number | null
          rejection_reason: string | null
          responded_at: string | null
          rider_id: string
          sequence_no: number
          status: string
          tip_amount: number
        }
        Insert: {
          base_payout?: number
          batch_id?: string | null
          delivered_at?: string | null
          distance_km?: number | null
          distance_payout?: number
          drop_address?: string | null
          drop_lat?: number | null
          drop_lng?: number | null
          id?: string
          offered_at?: string
          order_id: string
          payout_amount?: number
          picked_up_at?: string | null
          pickup_address?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          rejection_reason?: string | null
          responded_at?: string | null
          rider_id: string
          sequence_no?: number
          status?: string
          tip_amount?: number
        }
        Update: {
          base_payout?: number
          batch_id?: string | null
          delivered_at?: string | null
          distance_km?: number | null
          distance_payout?: number
          drop_address?: string | null
          drop_lat?: number | null
          drop_lng?: number | null
          id?: string
          offered_at?: string
          order_id?: string
          payout_amount?: number
          picked_up_at?: string | null
          pickup_address?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          rejection_reason?: string | null
          responded_at?: string | null
          rider_id?: string
          sequence_no?: number
          status?: string
          tip_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "rider_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "food_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rider_assignments_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
        ]
      }
      rider_locations: {
        Row: {
          accuracy_m: number | null
          heading: number | null
          id: string
          latitude: number
          longitude: number
          order_id: string | null
          recorded_at: string
          rider_id: string
          speed_kmph: number | null
        }
        Insert: {
          accuracy_m?: number | null
          heading?: number | null
          id?: string
          latitude: number
          longitude: number
          order_id?: string | null
          recorded_at?: string
          rider_id: string
          speed_kmph?: number | null
        }
        Update: {
          accuracy_m?: number | null
          heading?: number | null
          id?: string
          latitude?: number
          longitude?: number
          order_id?: string | null
          recorded_at?: string
          rider_id?: string
          speed_kmph?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rider_locations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "food_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rider_locations_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
        ]
      }
      rider_payouts: {
        Row: {
          assignment_id: string | null
          base_amount: number
          created_at: string
          distance_amount: number
          distance_km: number
          earned_at: string
          id: string
          order_id: string
          rider_id: string
          settled_at: string | null
          settlement_id: string | null
          status: string
          tip_amount: number
          total_amount: number
        }
        Insert: {
          assignment_id?: string | null
          base_amount?: number
          created_at?: string
          distance_amount?: number
          distance_km?: number
          earned_at?: string
          id?: string
          order_id: string
          rider_id: string
          settled_at?: string | null
          settlement_id?: string | null
          status?: string
          tip_amount?: number
          total_amount?: number
        }
        Update: {
          assignment_id?: string | null
          base_amount?: number
          created_at?: string
          distance_amount?: number
          distance_km?: number
          earned_at?: string
          id?: string
          order_id?: string
          rider_id?: string
          settled_at?: string | null
          settlement_id?: string | null
          status?: string
          tip_amount?: number
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "rider_payouts_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "rider_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rider_payouts_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rider_payouts_settlement_id_fkey"
            columns: ["settlement_id"]
            isOneToOne: false
            referencedRelation: "rider_settlements"
            referencedColumns: ["id"]
          },
        ]
      }
      rider_settlements: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string
          id: string
          initiated_at: string
          initiated_by: string | null
          method: string
          notes: string | null
          payout_count: number
          reference: string | null
          rider_id: string
          rider_name: string | null
          status: string
        }
        Insert: {
          amount?: number
          completed_at?: string | null
          created_at?: string
          id: string
          initiated_at?: string
          initiated_by?: string | null
          method?: string
          notes?: string | null
          payout_count?: number
          reference?: string | null
          rider_id: string
          rider_name?: string | null
          status?: string
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          initiated_at?: string
          initiated_by?: string | null
          method?: string
          notes?: string | null
          payout_count?: number
          reference?: string | null
          rider_id?: string
          rider_name?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "rider_settlements_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
        ]
      }
      riders: {
        Row: {
          aadhaar_image_url: string | null
          aadhaar_number: string | null
          area_id: string | null
          bank_account_number: string | null
          bank_holder_name: string | null
          bank_ifsc: string | null
          base_location_lat: number | null
          base_location_lng: number | null
          city_id: string | null
          created_at: string
          current_lat: number | null
          current_lng: number | null
          email: string | null
          id: string
          is_online: boolean
          kyc_status: string
          license_image_url: string | null
          license_number: string | null
          mobile: string
          name: string
          pan_image_url: string | null
          pan_number: string | null
          profile_photo: string | null
          rating: number
          shift_end: string | null
          shift_start: string | null
          status: string
          total_deliveries: number
          total_earnings: number
          updated_at: string
          user_id: string | null
          vehicle_number: string | null
          vehicle_type: string
        }
        Insert: {
          aadhaar_image_url?: string | null
          aadhaar_number?: string | null
          area_id?: string | null
          bank_account_number?: string | null
          bank_holder_name?: string | null
          bank_ifsc?: string | null
          base_location_lat?: number | null
          base_location_lng?: number | null
          city_id?: string | null
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          email?: string | null
          id: string
          is_online?: boolean
          kyc_status?: string
          license_image_url?: string | null
          license_number?: string | null
          mobile: string
          name: string
          pan_image_url?: string | null
          pan_number?: string | null
          profile_photo?: string | null
          rating?: number
          shift_end?: string | null
          shift_start?: string | null
          status?: string
          total_deliveries?: number
          total_earnings?: number
          updated_at?: string
          user_id?: string | null
          vehicle_number?: string | null
          vehicle_type: string
        }
        Update: {
          aadhaar_image_url?: string | null
          aadhaar_number?: string | null
          area_id?: string | null
          bank_account_number?: string | null
          bank_holder_name?: string | null
          bank_ifsc?: string | null
          base_location_lat?: number | null
          base_location_lng?: number | null
          city_id?: string | null
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          email?: string | null
          id?: string
          is_online?: boolean
          kyc_status?: string
          license_image_url?: string | null
          license_number?: string | null
          mobile?: string
          name?: string
          pan_image_url?: string | null
          pan_number?: string | null
          profile_photo?: string | null
          rating?: number
          shift_end?: string | null
          shift_start?: string | null
          status?: string
          total_deliveries?: number
          total_earnings?: number
          updated_at?: string
          user_id?: string | null
          vehicle_number?: string | null
          vehicle_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "riders_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "riders_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_searches: {
        Row: {
          created_at: string
          filters: Json
          id: string
          name: string
          notify: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          filters?: Json
          id?: string
          name?: string
          notify?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          filters?: Json
          id?: string
          name?: string
          notify?: boolean
          user_id?: string
        }
        Relationships: []
      }
      service_bookings: {
        Row: {
          assigned_vendor_name: string | null
          booking_date: string
          cgst_amount: number
          commission_amount: number
          commission_rate: number
          completion_notes: string | null
          completion_photo_url: string | null
          country_code: string
          created_at: string | null
          currency_code: string
          customer_address: string | null
          customer_id: string
          customer_name: string | null
          customer_notes: string | null
          customer_phone: string | null
          customer_pod_confirmed: boolean | null
          customer_pod_confirmed_at: string | null
          customer_pod_photo_url: string | null
          customer_rating: number | null
          customer_rating_comment: string | null
          discount: number
          end_time: string
          gst_on_platform_fee: number
          gst_rate: number
          id: string
          igst_amount: number
          is_interstate: boolean
          net_to_vendor: number
          notes: string | null
          otp_code: string | null
          otp_verified_at: string | null
          payment_status: string | null
          place_of_supply_code: string | null
          place_of_supply_state: string | null
          platform_fee: number
          points_used: number
          rated_at: string | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          sac_code: string | null
          service_id: string
          service_title: string | null
          settlement_id: string | null
          sgst_amount: number
          start_time: string
          status: string
          subtotal: number
          taxable_value: number
          total_amount: number | null
          updated_at: string | null
          vendor_completion_confirmed: boolean | null
          vendor_completion_confirmed_at: string | null
          vendor_id: string
        }
        Insert: {
          assigned_vendor_name?: string | null
          booking_date: string
          cgst_amount?: number
          commission_amount?: number
          commission_rate?: number
          completion_notes?: string | null
          completion_photo_url?: string | null
          country_code?: string
          created_at?: string | null
          currency_code?: string
          customer_address?: string | null
          customer_id: string
          customer_name?: string | null
          customer_notes?: string | null
          customer_phone?: string | null
          customer_pod_confirmed?: boolean | null
          customer_pod_confirmed_at?: string | null
          customer_pod_photo_url?: string | null
          customer_rating?: number | null
          customer_rating_comment?: string | null
          discount?: number
          end_time: string
          gst_on_platform_fee?: number
          gst_rate?: number
          id?: string
          igst_amount?: number
          is_interstate?: boolean
          net_to_vendor?: number
          notes?: string | null
          otp_code?: string | null
          otp_verified_at?: string | null
          payment_status?: string | null
          place_of_supply_code?: string | null
          place_of_supply_state?: string | null
          platform_fee?: number
          points_used?: number
          rated_at?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          sac_code?: string | null
          service_id: string
          service_title?: string | null
          settlement_id?: string | null
          sgst_amount?: number
          start_time: string
          status?: string
          subtotal?: number
          taxable_value?: number
          total_amount?: number | null
          updated_at?: string | null
          vendor_completion_confirmed?: boolean | null
          vendor_completion_confirmed_at?: string | null
          vendor_id: string
        }
        Update: {
          assigned_vendor_name?: string | null
          booking_date?: string
          cgst_amount?: number
          commission_amount?: number
          commission_rate?: number
          completion_notes?: string | null
          completion_photo_url?: string | null
          country_code?: string
          created_at?: string | null
          currency_code?: string
          customer_address?: string | null
          customer_id?: string
          customer_name?: string | null
          customer_notes?: string | null
          customer_phone?: string | null
          customer_pod_confirmed?: boolean | null
          customer_pod_confirmed_at?: string | null
          customer_pod_photo_url?: string | null
          customer_rating?: number | null
          customer_rating_comment?: string | null
          discount?: number
          end_time?: string
          gst_on_platform_fee?: number
          gst_rate?: number
          id?: string
          igst_amount?: number
          is_interstate?: boolean
          net_to_vendor?: number
          notes?: string | null
          otp_code?: string | null
          otp_verified_at?: string | null
          payment_status?: string | null
          place_of_supply_code?: string | null
          place_of_supply_state?: string | null
          platform_fee?: number
          points_used?: number
          rated_at?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          sac_code?: string | null
          service_id?: string
          service_title?: string | null
          settlement_id?: string | null
          sgst_amount?: number
          start_time?: string
          status?: string
          subtotal?: number
          taxable_value?: number
          total_amount?: number | null
          updated_at?: string | null
          vendor_completion_confirmed?: boolean | null
          vendor_completion_confirmed_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_categories: {
        Row: {
          banner_image: string | null
          commission_rate: number | null
          count: number
          created_at: string
          description: string | null
          display_order: number
          icon: string | null
          id: string
          image: string
          is_emergency: boolean | null
          is_trending: boolean | null
          name: string
          parent_id: string | null
          promotion_active: boolean | null
          promotion_banner_url: string | null
          promotion_title: string | null
          show_on_homepage: boolean
          status: string
          verification_status: string | null
        }
        Insert: {
          banner_image?: string | null
          commission_rate?: number | null
          count?: number
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string | null
          id: string
          image?: string
          is_emergency?: boolean | null
          is_trending?: boolean | null
          name: string
          parent_id?: string | null
          promotion_active?: boolean | null
          promotion_banner_url?: string | null
          promotion_title?: string | null
          show_on_homepage?: boolean
          status?: string
          verification_status?: string | null
        }
        Update: {
          banner_image?: string | null
          commission_rate?: number | null
          count?: number
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          image?: string
          is_emergency?: boolean | null
          is_trending?: boolean | null
          name?: string
          parent_id?: string | null
          promotion_active?: boolean | null
          promotion_banner_url?: string | null
          promotion_title?: string | null
          show_on_homepage?: boolean
          status?: string
          verification_status?: string | null
        }
        Relationships: []
      }
      service_vendors: {
        Row: {
          area_id: string | null
          background_image: string | null
          business_name: string
          category_id: string | null
          city_id: string | null
          commission_rate: number
          country_code: string
          created_at: string
          currency_code: string
          deleted_at: string | null
          deletion_reason: string | null
          email: string
          gstin: string | null
          id: string
          kyc_status: string | null
          max_redemption_percentage: number | null
          membership: string
          mobile: string
          name: string
          pan: string | null
          plan_end_date: string | null
          plan_id: string | null
          plan_payment_status: string
          plan_start_date: string | null
          plan_transaction_id: string | null
          rating: number | null
          referred_by: string | null
          shop_address: string | null
          shop_latitude: number | null
          shop_longitude: number | null
          shop_photo_url: string | null
          state_code: string | null
          state_name: string | null
          status: string
          tax_id: string | null
          tax_id_type: string | null
          total_orders: number | null
          total_products: number | null
          total_revenue: number | null
          vendor_category: string
        }
        Insert: {
          area_id?: string | null
          background_image?: string | null
          business_name?: string
          category_id?: string | null
          city_id?: string | null
          commission_rate?: number
          country_code?: string
          created_at?: string
          currency_code?: string
          deleted_at?: string | null
          deletion_reason?: string | null
          email?: string
          gstin?: string | null
          id: string
          kyc_status?: string | null
          max_redemption_percentage?: number | null
          membership?: string
          mobile?: string
          name: string
          pan?: string | null
          plan_end_date?: string | null
          plan_id?: string | null
          plan_payment_status?: string
          plan_start_date?: string | null
          plan_transaction_id?: string | null
          rating?: number | null
          referred_by?: string | null
          shop_address?: string | null
          shop_latitude?: number | null
          shop_longitude?: number | null
          shop_photo_url?: string | null
          state_code?: string | null
          state_name?: string | null
          status?: string
          tax_id?: string | null
          tax_id_type?: string | null
          total_orders?: number | null
          total_products?: number | null
          total_revenue?: number | null
          vendor_category?: string
        }
        Update: {
          area_id?: string | null
          background_image?: string | null
          business_name?: string
          category_id?: string | null
          city_id?: string | null
          commission_rate?: number
          country_code?: string
          created_at?: string
          currency_code?: string
          deleted_at?: string | null
          deletion_reason?: string | null
          email?: string
          gstin?: string | null
          id?: string
          kyc_status?: string | null
          max_redemption_percentage?: number | null
          membership?: string
          mobile?: string
          name?: string
          pan?: string | null
          plan_end_date?: string | null
          plan_id?: string | null
          plan_payment_status?: string
          plan_start_date?: string | null
          plan_transaction_id?: string | null
          rating?: number | null
          referred_by?: string | null
          shop_address?: string | null
          shop_latitude?: number | null
          shop_longitude?: number | null
          shop_photo_url?: string | null
          state_code?: string | null
          state_name?: string | null
          status?: string
          tax_id?: string | null
          tax_id_type?: string | null
          total_orders?: number | null
          total_products?: number | null
          total_revenue?: number | null
          vendor_category?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_vendors_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_vendors_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          booking_duration_minutes: number | null
          category_id: string | null
          category_name: string | null
          commission_override: number | null
          country_code: string
          created_at: string
          currency_code: string
          description: string
          discount: number
          duration: string | null
          emoji: string | null
          gst_rate: number
          id: string
          image: string | null
          images: Json | null
          latitude: number | null
          location_address: string | null
          long_description: string | null
          longitude: number | null
          max_bookings_per_slot: number | null
          max_points_redeemable: number
          max_redemption_percentage: number | null
          meta_description: string | null
          meta_title: string | null
          price: number
          pricing_slots: Json | null
          rating: number | null
          rejection_reason: string | null
          reviews: number | null
          sac_code: string | null
          service_area: string | null
          service_duration_minutes: number
          short_description: string | null
          slug: string | null
          status: string
          subcategory_id: string | null
          subcategory_name: string | null
          tax: number
          title: string
          updated_at: string | null
          vendor_id: string
          vendor_name: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          booking_duration_minutes?: number | null
          category_id?: string | null
          category_name?: string | null
          commission_override?: number | null
          country_code?: string
          created_at?: string
          currency_code?: string
          description?: string
          discount?: number
          duration?: string | null
          emoji?: string | null
          gst_rate?: number
          id: string
          image?: string | null
          images?: Json | null
          latitude?: number | null
          location_address?: string | null
          long_description?: string | null
          longitude?: number | null
          max_bookings_per_slot?: number | null
          max_points_redeemable?: number
          max_redemption_percentage?: number | null
          meta_description?: string | null
          meta_title?: string | null
          price?: number
          pricing_slots?: Json | null
          rating?: number | null
          rejection_reason?: string | null
          reviews?: number | null
          sac_code?: string | null
          service_area?: string | null
          service_duration_minutes?: number
          short_description?: string | null
          slug?: string | null
          status?: string
          subcategory_id?: string | null
          subcategory_name?: string | null
          tax?: number
          title: string
          updated_at?: string | null
          vendor_id: string
          vendor_name?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          booking_duration_minutes?: number | null
          category_id?: string | null
          category_name?: string | null
          commission_override?: number | null
          country_code?: string
          created_at?: string
          currency_code?: string
          description?: string
          discount?: number
          duration?: string | null
          emoji?: string | null
          gst_rate?: number
          id?: string
          image?: string | null
          images?: Json | null
          latitude?: number | null
          location_address?: string | null
          long_description?: string | null
          longitude?: number | null
          max_bookings_per_slot?: number | null
          max_points_redeemable?: number
          max_redemption_percentage?: number | null
          meta_description?: string | null
          meta_title?: string | null
          price?: number
          pricing_slots?: Json | null
          rating?: number | null
          rejection_reason?: string | null
          reviews?: number | null
          sac_code?: string | null
          service_area?: string | null
          service_duration_minutes?: number
          short_description?: string | null
          slug?: string | null
          status?: string
          subcategory_id?: string | null
          subcategory_name?: string | null
          tax?: number
          title?: string
          updated_at?: string | null
          vendor_id?: string
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "service_vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      settlements: {
        Row: {
          amount: number
          cgst_collected: number | null
          commission: number
          created_at: string
          gross_sales: number | null
          gst_on_commission: number | null
          id: string
          igst_collected: number | null
          net_amount: number
          order_id: string
          payable_to_vendor: number | null
          payout_method: string | null
          rejection_reason: string | null
          settled_at: string | null
          settlement_period_from: string | null
          settlement_period_to: string | null
          sgst_collected: number | null
          status: string
          taxable_value: number | null
          tcs_deducted: number | null
          tds_deducted: number | null
          transaction_reference: string | null
          utr_number: string | null
          vendor_id: string
          vendor_name: string | null
        }
        Insert: {
          amount?: number
          cgst_collected?: number | null
          commission?: number
          created_at?: string
          gross_sales?: number | null
          gst_on_commission?: number | null
          id: string
          igst_collected?: number | null
          net_amount?: number
          order_id: string
          payable_to_vendor?: number | null
          payout_method?: string | null
          rejection_reason?: string | null
          settled_at?: string | null
          settlement_period_from?: string | null
          settlement_period_to?: string | null
          sgst_collected?: number | null
          status?: string
          taxable_value?: number | null
          tcs_deducted?: number | null
          tds_deducted?: number | null
          transaction_reference?: string | null
          utr_number?: string | null
          vendor_id: string
          vendor_name?: string | null
        }
        Update: {
          amount?: number
          cgst_collected?: number | null
          commission?: number
          created_at?: string
          gross_sales?: number | null
          gst_on_commission?: number | null
          id?: string
          igst_collected?: number | null
          net_amount?: number
          order_id?: string
          payable_to_vendor?: number | null
          payout_method?: string | null
          rejection_reason?: string | null
          settled_at?: string | null
          settlement_period_from?: string | null
          settlement_period_to?: string | null
          sgst_collected?: number | null
          status?: string
          taxable_value?: number | null
          tcs_deducted?: number | null
          tds_deducted?: number | null
          transaction_reference?: string | null
          utr_number?: string | null
          vendor_id?: string
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "settlements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      social_audio: {
        Row: {
          artist: string | null
          audio_url: string | null
          cover_url: string | null
          created_at: string | null
          duration_seconds: number | null
          genre: string | null
          id: string
          is_trending: boolean | null
          status: string | null
          title: string
          use_count: number | null
        }
        Insert: {
          artist?: string | null
          audio_url?: string | null
          cover_url?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          genre?: string | null
          id?: string
          is_trending?: boolean | null
          status?: string | null
          title?: string
          use_count?: number | null
        }
        Update: {
          artist?: string | null
          audio_url?: string | null
          cover_url?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          genre?: string | null
          id?: string
          is_trending?: boolean | null
          status?: string | null
          title?: string
          use_count?: number | null
        }
        Relationships: []
      }
      social_bookmarks: {
        Row: {
          collection_name: string | null
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          collection_name?: string | null
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          collection_name?: string | null
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_bookmarks_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_channels: {
        Row: {
          cover_url: string | null
          created_at: string | null
          description: string | null
          id: string
          is_public: boolean | null
          member_count: number | null
          name: string
          owner_id: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          member_count?: number | null
          name?: string
          owner_id: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          member_count?: number | null
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
      social_comment_likes: {
        Row: {
          comment_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "social_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      social_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_pinned: boolean | null
          like_count: number | null
          parent_id: string | null
          post_id: string
          status: string | null
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          like_count?: number | null
          parent_id?: string | null
          post_id: string
          status?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          like_count?: number | null
          parent_id?: string | null
          post_id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "social_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_config: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string | null
          value: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: string | null
        }
        Relationships: []
      }
      social_conversations: {
        Row: {
          created_at: string | null
          group_name: string | null
          group_photo: string | null
          id: string
          is_group: boolean | null
          last_message_at: string | null
          participants: Json | null
        }
        Insert: {
          created_at?: string | null
          group_name?: string | null
          group_photo?: string | null
          id?: string
          is_group?: boolean | null
          last_message_at?: string | null
          participants?: Json | null
        }
        Update: {
          created_at?: string | null
          group_name?: string | null
          group_photo?: string | null
          id?: string
          is_group?: boolean | null
          last_message_at?: string | null
          participants?: Json | null
        }
        Relationships: []
      }
      social_follows: {
        Row: {
          created_at: string | null
          follower_id: string
          following_id: string
          id: string
          is_close_friend: boolean | null
          status: string
        }
        Insert: {
          created_at?: string | null
          follower_id: string
          following_id: string
          id?: string
          is_close_friend?: boolean | null
          status?: string
        }
        Update: {
          created_at?: string | null
          follower_id?: string
          following_id?: string
          id?: string
          is_close_friend?: boolean | null
          status?: string
        }
        Relationships: []
      }
      social_hashtags: {
        Row: {
          created_at: string | null
          id: string
          is_blocked: boolean | null
          is_trending: boolean | null
          name: string
          post_count: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_blocked?: boolean | null
          is_trending?: boolean | null
          name: string
          post_count?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_blocked?: boolean | null
          is_trending?: boolean | null
          name?: string
          post_count?: number | null
        }
        Relationships: []
      }
      social_highlights: {
        Row: {
          cover_url: string | null
          created_at: string | null
          id: string
          name: string
          sort_order: number | null
          story_ids: Json | null
          user_id: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string | null
          id?: string
          name?: string
          sort_order?: number | null
          story_ids?: Json | null
          user_id: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string | null
          id?: string
          name?: string
          sort_order?: number | null
          story_ids?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      social_likes: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          reaction_type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          reaction_type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          reaction_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "social_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      social_messages: {
        Row: {
          content: string | null
          conversation_id: string
          created_at: string | null
          deleted_at: string | null
          deleted_for_everyone: boolean
          id: string
          is_read: boolean | null
          is_vanish: boolean | null
          media_url: string | null
          message_type: string | null
          metadata: Json | null
          sender_id: string
        }
        Insert: {
          content?: string | null
          conversation_id: string
          created_at?: string | null
          deleted_at?: string | null
          deleted_for_everyone?: boolean
          id?: string
          is_read?: boolean | null
          is_vanish?: boolean | null
          media_url?: string | null
          message_type?: string | null
          metadata?: Json | null
          sender_id: string
        }
        Update: {
          content?: string | null
          conversation_id?: string
          created_at?: string | null
          deleted_at?: string | null
          deleted_for_everyone?: boolean
          id?: string
          is_read?: boolean | null
          is_vanish?: boolean | null
          media_url?: string | null
          message_type?: string | null
          metadata?: Json | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "social_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      social_notes: {
        Row: {
          audience: string | null
          content: string
          created_at: string | null
          expires_at: string
          id: string
          user_id: string
        }
        Insert: {
          audience?: string | null
          content?: string
          created_at?: string | null
          expires_at: string
          id?: string
          user_id: string
        }
        Update: {
          audience?: string | null
          content?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      social_notifications: {
        Row: {
          actor_id: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string | null
          reference_id: string | null
          reference_type: string | null
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          reference_id?: string | null
          reference_type?: string | null
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          reference_id?: string | null
          reference_type?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      social_posts: {
        Row: {
          allow_comments: string | null
          allow_remix: boolean | null
          audience: string | null
          caption: string | null
          category: string | null
          collab_user_id: string | null
          comment_count: number | null
          created_at: string | null
          edited_at: string | null
          hashtags: string[] | null
          hide_like_count: boolean | null
          id: string
          is_ai_generated: boolean | null
          is_collab: boolean | null
          is_edited: boolean
          is_pinned: boolean | null
          is_repost: boolean | null
          like_count: number | null
          location_name: string | null
          media: Json | null
          original_post_id: string | null
          post_type: string
          product_tags: Json | null
          repost_note: string | null
          save_count: number | null
          scheduled_at: string | null
          share_count: number | null
          status: string | null
          tagged_users: Json | null
          updated_at: string | null
          user_id: string
          view_count: number | null
        }
        Insert: {
          allow_comments?: string | null
          allow_remix?: boolean | null
          audience?: string | null
          caption?: string | null
          category?: string | null
          collab_user_id?: string | null
          comment_count?: number | null
          created_at?: string | null
          edited_at?: string | null
          hashtags?: string[] | null
          hide_like_count?: boolean | null
          id?: string
          is_ai_generated?: boolean | null
          is_collab?: boolean | null
          is_edited?: boolean
          is_pinned?: boolean | null
          is_repost?: boolean | null
          like_count?: number | null
          location_name?: string | null
          media?: Json | null
          original_post_id?: string | null
          post_type?: string
          product_tags?: Json | null
          repost_note?: string | null
          save_count?: number | null
          scheduled_at?: string | null
          share_count?: number | null
          status?: string | null
          tagged_users?: Json | null
          updated_at?: string | null
          user_id: string
          view_count?: number | null
        }
        Update: {
          allow_comments?: string | null
          allow_remix?: boolean | null
          audience?: string | null
          caption?: string | null
          category?: string | null
          collab_user_id?: string | null
          comment_count?: number | null
          created_at?: string | null
          edited_at?: string | null
          hashtags?: string[] | null
          hide_like_count?: boolean | null
          id?: string
          is_ai_generated?: boolean | null
          is_collab?: boolean | null
          is_edited?: boolean
          is_pinned?: boolean | null
          is_repost?: boolean | null
          like_count?: number | null
          location_name?: string | null
          media?: Json | null
          original_post_id?: string | null
          post_type?: string
          product_tags?: Json | null
          repost_note?: string | null
          save_count?: number | null
          scheduled_at?: string | null
          share_count?: number | null
          status?: string | null
          tagged_users?: Json | null
          updated_at?: string | null
          user_id?: string
          view_count?: number | null
        }
        Relationships: []
      }
      social_profiles: {
        Row: {
          account_type: string
          avatar_url: string | null
          bio: string | null
          category: string | null
          created_at: string | null
          display_name: string
          follower_count: number | null
          following_count: number | null
          id: string
          is_private: boolean | null
          is_verified: boolean | null
          location: string | null
          post_count: number | null
          pronouns: string | null
          updated_at: string | null
          user_id: string
          username: string
          website: string | null
        }
        Insert: {
          account_type?: string
          avatar_url?: string | null
          bio?: string | null
          category?: string | null
          created_at?: string | null
          display_name?: string
          follower_count?: number | null
          following_count?: number | null
          id?: string
          is_private?: boolean | null
          is_verified?: boolean | null
          location?: string | null
          post_count?: number | null
          pronouns?: string | null
          updated_at?: string | null
          user_id: string
          username: string
          website?: string | null
        }
        Update: {
          account_type?: string
          avatar_url?: string | null
          bio?: string | null
          category?: string | null
          created_at?: string | null
          display_name?: string
          follower_count?: number | null
          following_count?: number | null
          id?: string
          is_private?: boolean | null
          is_verified?: boolean | null
          location?: string | null
          post_count?: number | null
          pronouns?: string | null
          updated_at?: string | null
          user_id?: string
          username?: string
          website?: string | null
        }
        Relationships: []
      }
      social_reports: {
        Row: {
          admin_note: string | null
          content_id: string
          content_type: string
          created_at: string | null
          details: string | null
          id: string
          reason: string
          reporter_id: string
          status: string | null
        }
        Insert: {
          admin_note?: string | null
          content_id: string
          content_type: string
          created_at?: string | null
          details?: string | null
          id?: string
          reason?: string
          reporter_id: string
          status?: string | null
        }
        Update: {
          admin_note?: string | null
          content_id?: string
          content_type?: string
          created_at?: string | null
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          status?: string | null
        }
        Relationships: []
      }
      social_shares: {
        Row: {
          channel: string | null
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          channel?: string | null
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          channel?: string | null
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_shares_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_stories: {
        Row: {
          audience: string | null
          background_color: string | null
          created_at: string | null
          edited_at: string | null
          expires_at: string
          id: string
          is_edited: boolean
          media_type: string | null
          media_url: string | null
          reply_count: number | null
          stickers: Json | null
          text_content: string | null
          updated_at: string | null
          user_id: string
          view_count: number | null
        }
        Insert: {
          audience?: string | null
          background_color?: string | null
          created_at?: string | null
          edited_at?: string | null
          expires_at: string
          id?: string
          is_edited?: boolean
          media_type?: string | null
          media_url?: string | null
          reply_count?: number | null
          stickers?: Json | null
          text_content?: string | null
          updated_at?: string | null
          user_id: string
          view_count?: number | null
        }
        Update: {
          audience?: string | null
          background_color?: string | null
          created_at?: string | null
          edited_at?: string | null
          expires_at?: string
          id?: string
          is_edited?: boolean
          media_type?: string | null
          media_url?: string | null
          reply_count?: number | null
          stickers?: Json | null
          text_content?: string | null
          updated_at?: string | null
          user_id?: string
          view_count?: number | null
        }
        Relationships: []
      }
      social_story_views: {
        Row: {
          created_at: string | null
          id: string
          reaction: string | null
          story_id: string
          viewer_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          reaction?: string | null
          story_id: string
          viewer_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          reaction?: string | null
          story_id?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_story_views_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "social_stories"
            referencedColumns: ["id"]
          },
        ]
      }
      splash_screens: {
        Row: {
          app_type: string
          background_color: string
          created_at: string
          display_order: number
          id: string
          image_url: string
          is_active: boolean
          tagline: string | null
          title: string
          updated_at: string
        }
        Insert: {
          app_type?: string
          background_color?: string
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string
          is_active?: boolean
          tagline?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          app_type?: string
          background_color?: string
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string
          is_active?: boolean
          tagline?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      states: {
        Row: {
          code: string
          country_code: string
          created_at: string
          id: string
          name: string
          status: string
        }
        Insert: {
          code: string
          country_code?: string
          created_at?: string
          id?: string
          name: string
          status?: string
        }
        Update: {
          code?: string
          country_code?: string
          created_at?: string
          id?: string
          name?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "states_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
        ]
      }
      support_ticket_messages: {
        Row: {
          attachment_url: string | null
          created_at: string
          id: string
          is_internal: boolean
          message: string
          read_at: string | null
          sender_id: string
          sender_name: string | null
          sender_role: string
          ticket_id: string
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string
          id?: string
          is_internal?: boolean
          message: string
          read_at?: string | null
          sender_id: string
          sender_name?: string | null
          sender_role: string
          ticket_id: string
        }
        Update: {
          attachment_url?: string | null
          created_at?: string
          id?: string
          is_internal?: boolean
          message?: string
          read_at?: string | null
          sender_id?: string
          sender_name?: string | null
          sender_role?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string
          created_at: string
          customer_id: string
          customer_name: string
          description: string
          id: string
          priority: string
          resolution_notes: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          customer_id: string
          customer_name?: string
          description?: string
          id: string
          priority?: string
          resolution_notes?: string | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          customer_id?: string
          customer_name?: string
          description?: string
          id?: string
          priority?: string
          resolution_notes?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      tax_config: {
        Row: {
          applied_to: string
          created_at: string
          id: string
          name: string
          rate: number
          status: string
          type: string
        }
        Insert: {
          applied_to?: string
          created_at?: string
          id: string
          name: string
          rate?: number
          status?: string
          type?: string
        }
        Update: {
          applied_to?: string
          created_at?: string
          id?: string
          name?: string
          rate?: number
          status?: string
          type?: string
        }
        Relationships: []
      }
      tax_slabs: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          rate: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          rate?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          rate?: number
        }
        Relationships: []
      }
      user_devices: {
        Row: {
          app_version: string
          created_at: string
          device_id: string
          first_login: string
          id: string
          onboarding_completed: boolean
          platform: string
          push_token: string | null
          user_id: string
        }
        Insert: {
          app_version?: string
          created_at?: string
          device_id?: string
          first_login?: string
          id?: string
          onboarding_completed?: boolean
          platform?: string
          push_token?: string | null
          user_id: string
        }
        Update: {
          app_version?: string
          created_at?: string
          device_id?: string
          first_login?: string
          id?: string
          onboarding_completed?: boolean
          platform?: string
          push_token?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          customer_id: string | null
          id: string
          password_set: boolean
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
          vendor_id: string | null
        }
        Insert: {
          customer_id?: string | null
          id?: string
          password_set?: boolean
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
          vendor_id?: string | null
        }
        Update: {
          customer_id?: string | null
          id?: string
          password_set?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
          vendor_id?: string | null
        }
        Relationships: []
      }
      vendor_applications: {
        Row: {
          aadhaar_back_url: string | null
          aadhaar_front_url: string | null
          aadhaar_number: string | null
          admin_notes: string | null
          bank_account_number: string | null
          bank_holder_name: string | null
          bank_ifsc: string | null
          business_description: string | null
          business_name: string
          business_type: string | null
          category: string | null
          city: string | null
          created_at: string
          district: string | null
          email: string
          fb_link: string | null
          fssai_url: string | null
          gst_certificate_url: string | null
          gst_number: string | null
          id: string
          instagram_link: string | null
          kyc_status: string
          latitude: number | null
          longitude: number | null
          name: string
          pan_image_url: string | null
          pan_number: string | null
          phone: string
          postal_code: string | null
          referred_by: string | null
          rejection_reason: string | null
          secondary_phone: string | null
          selected_categories: Json | null
          selected_subcategories: Json | null
          shop_address: string | null
          shop_photo_url: string | null
          state: string | null
          status: string
          store_logo_url: string | null
          store_name: string | null
          subcategory: string | null
          updated_at: string
          user_id: string
          vendor_category: string
        }
        Insert: {
          aadhaar_back_url?: string | null
          aadhaar_front_url?: string | null
          aadhaar_number?: string | null
          admin_notes?: string | null
          bank_account_number?: string | null
          bank_holder_name?: string | null
          bank_ifsc?: string | null
          business_description?: string | null
          business_name?: string
          business_type?: string | null
          category?: string | null
          city?: string | null
          created_at?: string
          district?: string | null
          email?: string
          fb_link?: string | null
          fssai_url?: string | null
          gst_certificate_url?: string | null
          gst_number?: string | null
          id?: string
          instagram_link?: string | null
          kyc_status?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          pan_image_url?: string | null
          pan_number?: string | null
          phone?: string
          postal_code?: string | null
          referred_by?: string | null
          rejection_reason?: string | null
          secondary_phone?: string | null
          selected_categories?: Json | null
          selected_subcategories?: Json | null
          shop_address?: string | null
          shop_photo_url?: string | null
          state?: string | null
          status?: string
          store_logo_url?: string | null
          store_name?: string | null
          subcategory?: string | null
          updated_at?: string
          user_id: string
          vendor_category?: string
        }
        Update: {
          aadhaar_back_url?: string | null
          aadhaar_front_url?: string | null
          aadhaar_number?: string | null
          admin_notes?: string | null
          bank_account_number?: string | null
          bank_holder_name?: string | null
          bank_ifsc?: string | null
          business_description?: string | null
          business_name?: string
          business_type?: string | null
          category?: string | null
          city?: string | null
          created_at?: string
          district?: string | null
          email?: string
          fb_link?: string | null
          fssai_url?: string | null
          gst_certificate_url?: string | null
          gst_number?: string | null
          id?: string
          instagram_link?: string | null
          kyc_status?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          pan_image_url?: string | null
          pan_number?: string | null
          phone?: string
          postal_code?: string | null
          referred_by?: string | null
          rejection_reason?: string | null
          secondary_phone?: string | null
          selected_categories?: Json | null
          selected_subcategories?: Json | null
          shop_address?: string | null
          shop_photo_url?: string | null
          state?: string | null
          status?: string
          store_logo_url?: string | null
          store_name?: string | null
          subcategory?: string | null
          updated_at?: string
          user_id?: string
          vendor_category?: string
        }
        Relationships: []
      }
      vendor_availability: {
        Row: {
          buffer_minutes: number
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_available: boolean
          start_time: string
          time_slots: Json
          updated_at: string
          vendor_id: string
        }
        Insert: {
          buffer_minutes?: number
          created_at?: string
          day_of_week: number
          end_time?: string
          id?: string
          is_available?: boolean
          start_time?: string
          time_slots?: Json
          updated_at?: string
          vendor_id: string
        }
        Update: {
          buffer_minutes?: number
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_available?: boolean
          start_time?: string
          time_slots?: Json
          updated_at?: string
          vendor_id?: string
        }
        Relationships: []
      }
      vendor_bank_accounts: {
        Row: {
          account_holder: string
          account_number: string
          account_type: string
          bank_name: string
          created_at: string
          id: string
          ifsc_code: string
          is_primary: boolean
          updated_at: string
          vendor_id: string
        }
        Insert: {
          account_holder?: string
          account_number?: string
          account_type?: string
          bank_name?: string
          created_at?: string
          id?: string
          ifsc_code?: string
          is_primary?: boolean
          updated_at?: string
          vendor_id: string
        }
        Update: {
          account_holder?: string
          account_number?: string
          account_type?: string
          bank_name?: string
          created_at?: string
          id?: string
          ifsc_code?: string
          is_primary?: boolean
          updated_at?: string
          vendor_id?: string
        }
        Relationships: []
      }
      vendor_date_overrides: {
        Row: {
          buffer_minutes: number | null
          created_at: string
          end_time: string | null
          id: string
          is_available: boolean
          override_date: string
          reason: string | null
          start_time: string | null
          updated_at: string
          vendor_id: string
        }
        Insert: {
          buffer_minutes?: number | null
          created_at?: string
          end_time?: string | null
          id?: string
          is_available?: boolean
          override_date: string
          reason?: string | null
          start_time?: string | null
          updated_at?: string
          vendor_id: string
        }
        Update: {
          buffer_minutes?: number | null
          created_at?: string
          end_time?: string | null
          id?: string
          is_available?: boolean
          override_date?: string
          reason?: string | null
          start_time?: string | null
          updated_at?: string
          vendor_id?: string
        }
        Relationships: []
      }
      vendor_dropshipping_settings: {
        Row: {
          auto_forward_orders: boolean
          created_at: string
          default_margin_percent: number
          default_supplier_id: string | null
          enabled: boolean
          notify_on_status_change: boolean
          updated_at: string
          vendor_id: string
        }
        Insert: {
          auto_forward_orders?: boolean
          created_at?: string
          default_margin_percent?: number
          default_supplier_id?: string | null
          enabled?: boolean
          notify_on_status_change?: boolean
          updated_at?: string
          vendor_id: string
        }
        Update: {
          auto_forward_orders?: boolean
          created_at?: string
          default_margin_percent?: number
          default_supplier_id?: string | null
          enabled?: boolean
          notify_on_status_change?: boolean
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_dropshipping_settings_default_supplier_id_fkey"
            columns: ["default_supplier_id"]
            isOneToOne: false
            referencedRelation: "dropshipping_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_notifications: {
        Row: {
          created_at: string
          deep_link: string | null
          id: string
          is_read: boolean
          message: string
          reference_id: string | null
          reference_type: string | null
          title: string
          type: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          deep_link?: string | null
          id?: string
          is_read?: boolean
          message?: string
          reference_id?: string | null
          reference_type?: string | null
          title: string
          type?: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          deep_link?: string | null
          id?: string
          is_read?: boolean
          message?: string
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: string
          vendor_id?: string
        }
        Relationships: []
      }
      vendor_onboarding_screens: {
        Row: {
          created_at: string
          description: string
          display_order: number
          id: string
          image_url: string
          is_active: boolean
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          display_order?: number
          id?: string
          image_url?: string
          is_active?: boolean
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          display_order?: number
          id?: string
          image_url?: string
          is_active?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      vendor_plans: {
        Row: {
          banner_ads: boolean
          commission_percentage: number
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          max_redemption_percentage: number
          payment_mode: string
          plan_name: string
          plan_tier: number
          plan_type: string
          price: number
          priority_listing: boolean
          radius_km: number
          updated_at: string
          validity_days: number
          video_ads: boolean
          visibility_type: string
        }
        Insert: {
          banner_ads?: boolean
          commission_percentage?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_redemption_percentage?: number
          payment_mode?: string
          plan_name: string
          plan_tier?: number
          plan_type?: string
          price?: number
          priority_listing?: boolean
          radius_km?: number
          updated_at?: string
          validity_days?: number
          video_ads?: boolean
          visibility_type?: string
        }
        Update: {
          banner_ads?: boolean
          commission_percentage?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_redemption_percentage?: number
          payment_mode?: string
          plan_name?: string
          plan_tier?: number
          plan_type?: string
          price?: number
          priority_listing?: boolean
          radius_km?: number
          updated_at?: string
          validity_days?: number
          video_ads?: boolean
          visibility_type?: string
        }
        Relationships: []
      }
      vendor_tds_ledger: {
        Row: {
          certificate_no: string | null
          challan_no: string | null
          created_at: string
          deposited_at: string | null
          fy_start: number
          gross_payout: number
          id: string
          net_payout: number
          order_id: string | null
          quarter: number
          settlement_id: string | null
          tds_amount: number
          tds_rate: number
          vendor_id: string
          vendor_pan: string | null
        }
        Insert: {
          certificate_no?: string | null
          challan_no?: string | null
          created_at?: string
          deposited_at?: string | null
          fy_start: number
          gross_payout: number
          id?: string
          net_payout: number
          order_id?: string | null
          quarter: number
          settlement_id?: string | null
          tds_amount: number
          tds_rate?: number
          vendor_id: string
          vendor_pan?: string | null
        }
        Update: {
          certificate_no?: string | null
          challan_no?: string | null
          created_at?: string
          deposited_at?: string | null
          fy_start?: number
          gross_payout?: number
          id?: string
          net_payout?: number
          order_id?: string | null
          quarter?: number
          settlement_id?: string | null
          tds_amount?: number
          tds_rate?: number
          vendor_id?: string
          vendor_pan?: string | null
        }
        Relationships: []
      }
      vendors: {
        Row: {
          area_id: string | null
          background_image: string | null
          business_name: string
          category_id: string | null
          city_id: string | null
          commission_rate: number
          country_code: string
          created_at: string
          currency_code: string
          deleted_at: string | null
          deletion_reason: string | null
          email: string
          gstin: string | null
          id: string
          kyc_status: string | null
          max_redemption_percentage: number | null
          membership: string
          mobile: string
          name: string
          pan: string | null
          plan_end_date: string | null
          plan_id: string | null
          plan_payment_status: string
          plan_start_date: string | null
          plan_transaction_id: string | null
          rating: number | null
          referred_by: string | null
          shop_address: string | null
          shop_latitude: number | null
          shop_longitude: number | null
          shop_photo_url: string | null
          state_code: string | null
          state_name: string | null
          status: string
          tax_id: string | null
          tax_id_type: string | null
          total_orders: number | null
          total_products: number | null
          total_revenue: number | null
          vendor_category: string
        }
        Insert: {
          area_id?: string | null
          background_image?: string | null
          business_name?: string
          category_id?: string | null
          city_id?: string | null
          commission_rate?: number
          country_code?: string
          created_at?: string
          currency_code?: string
          deleted_at?: string | null
          deletion_reason?: string | null
          email?: string
          gstin?: string | null
          id: string
          kyc_status?: string | null
          max_redemption_percentage?: number | null
          membership?: string
          mobile?: string
          name: string
          pan?: string | null
          plan_end_date?: string | null
          plan_id?: string | null
          plan_payment_status?: string
          plan_start_date?: string | null
          plan_transaction_id?: string | null
          rating?: number | null
          referred_by?: string | null
          shop_address?: string | null
          shop_latitude?: number | null
          shop_longitude?: number | null
          shop_photo_url?: string | null
          state_code?: string | null
          state_name?: string | null
          status?: string
          tax_id?: string | null
          tax_id_type?: string | null
          total_orders?: number | null
          total_products?: number | null
          total_revenue?: number | null
          vendor_category?: string
        }
        Update: {
          area_id?: string | null
          background_image?: string | null
          business_name?: string
          category_id?: string | null
          city_id?: string | null
          commission_rate?: number
          country_code?: string
          created_at?: string
          currency_code?: string
          deleted_at?: string | null
          deletion_reason?: string | null
          email?: string
          gstin?: string | null
          id?: string
          kyc_status?: string | null
          max_redemption_percentage?: number | null
          membership?: string
          mobile?: string
          name?: string
          pan?: string | null
          plan_end_date?: string | null
          plan_id?: string | null
          plan_payment_status?: string
          plan_start_date?: string | null
          plan_transaction_id?: string | null
          rating?: number | null
          referred_by?: string | null
          shop_address?: string | null
          shop_latitude?: number | null
          shop_longitude?: number | null
          shop_photo_url?: string | null
          state_code?: string | null
          state_name?: string | null
          status?: string
          tax_id?: string | null
          tax_id_type?: string | null
          total_orders?: number | null
          total_products?: number | null
          total_revenue?: number | null
          vendor_category?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendors_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendors_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendors_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "vendor_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      video_ads: {
        Row: {
          auto_open_fullscreen: boolean
          clicks: number
          created_at: string
          cta_link: string | null
          cta_text: string | null
          display_mode: string
          duration_seconds: number | null
          end_date: string | null
          id: string
          impressions: number
          show_delay_seconds: number
          start_date: string | null
          status: string
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_url: string
        }
        Insert: {
          auto_open_fullscreen?: boolean
          clicks?: number
          created_at?: string
          cta_link?: string | null
          cta_text?: string | null
          display_mode?: string
          duration_seconds?: number | null
          end_date?: string | null
          id?: string
          impressions?: number
          show_delay_seconds?: number
          start_date?: string | null
          status?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_url?: string
        }
        Update: {
          auto_open_fullscreen?: boolean
          clicks?: number
          created_at?: string
          cta_link?: string | null
          cta_text?: string | null
          display_mode?: string
          duration_seconds?: number | null
          end_date?: string | null
          id?: string
          impressions?: number
          show_delay_seconds?: number
          start_date?: string | null
          status?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_url?: string
        }
        Relationships: []
      }
      video_processing_jobs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          metadata: Json | null
          original_storage_path: string | null
          original_url: string
          processed_storage_path: string | null
          processed_url: string | null
          status: string
          thumbnail_storage_path: string | null
          thumbnail_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          original_storage_path?: string | null
          original_url: string
          processed_storage_path?: string | null
          processed_url?: string | null
          status?: string
          thumbnail_storage_path?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          original_storage_path?: string | null
          original_url?: string
          processed_storage_path?: string | null
          processed_url?: string | null
          status?: string
          thumbnail_storage_path?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      website_queries: {
        Row: {
          admin_reply: string | null
          created_at: string
          email: string
          id: string
          message: string
          name: string
          phone: string
          replied_at: string | null
          replied_by: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          admin_reply?: string | null
          created_at?: string
          email?: string
          id: string
          message?: string
          name: string
          phone?: string
          replied_at?: string | null
          replied_by?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Update: {
          admin_reply?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string
          replied_at?: string | null
          replied_by?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      restaurant_rating_summary: {
        Row: {
          avg_food: number | null
          avg_restaurant: number | null
          avg_rider: number | null
          restaurant_id: string | null
          review_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "food_reviews_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      are_mutual_followers: {
        Args: { _user_a: string; _user_b: string }
        Returns: boolean
      }
      assign_namakkal_coupon: { Args: { _customer_id: string }; Returns: Json }
      auto_assign_nearest_rider: { Args: { _order_id: string }; Returns: Json }
      backfill_namakkal_coupons: { Args: { _days?: number }; Returns: Json }
      best_food_coupon: {
        Args: {
          _customer_id: string
          _restaurant_id: string
          _subtotal: number
        }
        Returns: Json
      }
      calculate_entity_avg_rating: {
        Args: { _entity_id: string; _entity_type: string }
        Returns: number
      }
      cancel_food_order_by_customer: {
        Args: { _order_id: string; _reason: string }
        Returns: Json
      }
      check_otp_rate_limit: { Args: { _phone: string }; Returns: Json }
      check_phone_login_status: { Args: { _phone: string }; Returns: Json }
      check_phone_registered: { Args: { _phone: string }; Returns: boolean }
      count_mutual_followers: {
        Args: { _profile: string; _viewer: string }
        Returns: number
      }
      create_rider_settlement: {
        Args: {
          _method?: string
          _notes?: string
          _reference?: string
          _rider_id: string
        }
        Returns: Json
      }
      create_social_notification: {
        Args: {
          _actor_id: string
          _message: string
          _reference_id: string
          _reference_type: string
          _type: string
          _user_id: string
        }
        Returns: undefined
      }
      create_vendor_notification: {
        Args: {
          _deep_link?: string
          _message: string
          _reference_id?: string
          _reference_type?: string
          _title: string
          _type: string
          _vendor_id: string
        }
        Returns: string
      }
      credit_points_to_user: {
        Args: {
          _auth_user_id: string
          _dedupe_key: string
          _description: string
          _points: number
          _type: string
        }
        Returns: undefined
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      evaluate_cart_rules: {
        Args: {
          _country_code?: string
          _customer_id: string
          _items: Json
          _module?: string
          _subtotal: number
        }
        Returns: Json
      }
      evaluate_coupon_eligibility: {
        Args: {
          _campaign_id: string
          _cart_value?: number
          _customer_id?: string
          _lat?: number
          _lng?: number
          _product_ids?: string[]
          _quantity?: number
          _vendor_id?: string
        }
        Returns: Json
      }
      evaluate_coupon_rollback: {
        Args: { p_event: string; p_order_id: string; p_product_id?: string }
        Returns: Json
      }
      expire_coupon_reservations: { Args: never; Returns: number }
      expire_coupons_and_campaigns: { Args: never; Returns: Json }
      fire_push_to_user: {
        Args: {
          _body: string
          _deep_link?: string
          _title: string
          _user_id: string
        }
        Returns: undefined
      }
      fraud_blacklist_add: {
        Args: {
          p_entity_type: string
          p_entity_value: string
          p_expires_at?: string
          p_metadata?: Json
          p_reason?: string
          p_severity?: string
          p_source?: string
        }
        Returns: string
      }
      fraud_blacklist_check: {
        Args: { p_entity_type: string; p_entity_value: string }
        Returns: boolean
      }
      fraud_evaluate: {
        Args: {
          p_campaign_id?: string
          p_code?: string
          p_customer_id?: string
          p_device_fingerprint?: string
          p_event: string
          p_ip_address?: string
          p_lat?: number
          p_lng?: number
          p_metadata?: Json
          p_mobile?: string
          p_order_id?: string
        }
        Returns: Json
      }
      fraud_rate_limit_hit: {
        Args: {
          p_action: string
          p_key: string
          p_max: number
          p_window_seconds: number
        }
        Returns: Json
      }
      fraud_track_device: {
        Args: {
          p_customer_id?: string
          p_fingerprint: string
          p_metadata?: Json
        }
        Returns: string
      }
      generate_coupon_codes: {
        Args: { _campaign_id: string; _count: number; _length?: number }
        Returns: {
          code: string
        }[]
      }
      generate_coupon_codes_v2: {
        Args: {
          _batch_number?: string
          _campaign_id: string
          _charset?: string
          _count: number
          _length?: number
          _prefix?: string
          _separator?: string
          _suffix?: string
        }
        Returns: {
          batch_number: string
          code: string
        }[]
      }
      generate_random_coupon_code: { Args: { _len: number }; Returns: string }
      generate_service_slots: {
        Args: { _date: string; _service_id: string }
        Returns: {
          end_time: string
          is_booked: boolean
          start_time: string
        }[]
      }
      get_active_country: { Args: never; Returns: Json }
      get_active_country_code: { Args: never; Returns: string }
      get_active_coupon_reservation: {
        Args: { _customer_id: string }
        Returns: {
          campaign_id: string
          code: string
          expires_at: string
          reservation_id: string
          reserved_at: string
          seconds_remaining: number
          status: string
        }[]
      }
      get_auth_bootstrap: { Args: { _portal?: string }; Returns: Json }
      get_coupon_eligibility_breakdown: {
        Args: { _campaign_id: string; _customer_id: string }
        Returns: Json
      }
      get_customer_available_coupons: {
        Args: { _customer_id: string; _lat?: number; _lng?: number }
        Returns: {
          campaign_id: string
          code: string
          code_mode: string
          description: string
          discount_type: string
          discount_value: number
          expires_at: string
          max_discount: number
          min_order_amount: number
          name: string
          popup_image_url: string
          product_ids: string[]
          qty_limit: number
          vendor_id: string
        }[]
      }
      get_customer_coupon_history: {
        Args: { p_customer_id: string; p_limit?: number; p_offset?: number }
        Returns: {
          campaign_id: string
          campaign_name: string
          code: string
          discount_amount: number
          order_amount: number
          order_id: string
          product_id: string
          redeemed_at: string
          redemption_id: string
          rolled_back: boolean
          vendor_id: string
        }[]
      }
      get_customer_id: { Args: { _user_id: string }; Returns: string }
      get_customer_rollback_history: {
        Args: { p_customer_id: string; p_limit?: number; p_offset?: number }
        Returns: {
          campaign_id: string
          campaign_name: string
          code: string
          new_status: string
          old_status: string
          order_id: string
          refund_id: string
          rollback_id: string
          rollback_reason: string
          rolled_back_at: string
        }[]
      }
      get_feed_with_meta: {
        Args: {
          _limit?: number
          _mode?: string
          _offset?: number
          _viewer?: string
        }
        Returns: {
          author_avatar_url: string
          author_display_name: string
          author_is_verified: boolean
          author_username: string
          caption: string
          category: string
          comment_count: number
          created_at: string
          hashtags: Json
          id: string
          is_edited: boolean
          is_liked: boolean
          is_repost: boolean
          is_saved: boolean
          like_count: number
          media: Json
          original_post: Json
          original_post_id: string
          post_type: string
          product_tags: Json
          repost_note: string
          save_count: number
          share_count: number
          status: string
          updated_at: string
          user_id: string
        }[]
      }
      get_friends_of_friends: {
        Args: { _limit?: number; _user: string }
        Returns: {
          avatar_url: string
          display_name: string
          mutual_count: number
          user_id: string
          username: string
        }[]
      }
      get_mutual_followers: {
        Args: { _limit?: number; _profile: string; _viewer: string }
        Returns: {
          avatar_url: string
          display_name: string
          user_id: string
          username: string
        }[]
      }
      get_my_customer_orders: {
        Args: never
        Returns: {
          applied_cart_rules: Json
          cart_rule_discount: number
          cgst_amount: number | null
          commission_source: string | null
          country_code: string
          coupon_campaign_id: string | null
          coupon_code: string | null
          coupon_discount: number
          coupon_snapshot: Json | null
          courier_name: string | null
          created_at: string
          currency_code: string
          customer_id: string
          customer_name: string | null
          customer_notes: string | null
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          delivery_rating: number | null
          discount: number
          effective_commission: number | null
          effective_max_redemption: number | null
          gst_on_platform_fee: number | null
          id: string
          igst_amount: number | null
          invoice_no: string | null
          is_interstate: boolean | null
          items: Json | null
          payment_reference_id: string | null
          place_of_supply_code: string | null
          place_of_supply_state: string | null
          platform_fee: number | null
          pod_confirmed: boolean | null
          pod_confirmed_at: string | null
          points_used: number
          rated_at: string | null
          rating_comment: string | null
          razorpay_order_id: string | null
          redemption_source: string | null
          sgst_amount: number | null
          shipping_notes: string | null
          shipping_type: string | null
          status: string
          subtotal: number
          tax: number
          taxable_value: number | null
          tcs_amount: number | null
          total: number
          tracking_number: string | null
          tracking_url: string | null
          updated_at: string
          vendor_gstin: string | null
          vendor_id: string
          vendor_name: string | null
          vendor_state: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_rider_id: { Args: { _user_id: string }; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_vendor_coupon_history: {
        Args: { p_limit?: number; p_offset?: number; p_vendor_id: string }
        Returns: {
          campaign_id: string
          campaign_name: string
          code: string
          customer_id: string
          customer_mobile: string
          discount_amount: number
          order_amount: number
          order_id: string
          redeemed_at: string
          usage_id: string
        }[]
      }
      get_vendor_id: { Args: { _user_id: string }; Returns: string }
      get_vendor_rollback_history: {
        Args: { p_limit?: number; p_offset?: number; p_vendor_id: string }
        Returns: {
          campaign_id: string
          campaign_name: string
          code: string
          customer_id: string
          new_status: string
          old_status: string
          order_id: string
          rollback_id: string
          rollback_reason: string
          rolled_back_at: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      haversine_distance: {
        Args: { lat1: number; lat2: number; lon1: number; lon2: number }
        Returns: number
      }
      initiate_food_refund: {
        Args: {
          _amount: number
          _order_id: string
          _reason?: string
          _refund_method?: string
        }
        Returns: Json
      }
      is_admin_user: { Args: { _user_id: string }; Returns: boolean }
      is_conversation_participant: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      is_module_enabled: { Args: { _module_key: string }; Returns: boolean }
      match_contacts_by_phone: {
        Args: { _phones: string[] }
        Returns: {
          id: string
          mobile: string
          name: string
          profile_photo: string
        }[]
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      next_invoice_number: {
        Args: { _doc_type: string; _fy_start: number; _vendor_id: string }
        Returns: string
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      recommend_coupons_for_cart: {
        Args: {
          _cart_items: Json
          _customer_id: string
          _lat?: number
          _limit?: number
          _lng?: number
          _subtotal: number
        }
        Returns: Json
      }
      redeem_coupon_code: {
        Args: {
          _code: string
          _customer_id: string
          _discount_amount: number
          _order_id: string
          _product_id: string
        }
        Returns: Json
      }
      redeem_coupon_for_order: {
        Args: {
          p_code: string
          p_customer_id?: string
          p_device?: string
          p_discount_amount?: number
          p_ip?: string
          p_order_amount?: number
          p_order_id: string
          p_payment_reference?: string
          p_product_id?: string
          p_require_payment_success?: boolean
          p_user_agent?: string
          p_vendor_id?: string
        }
        Returns: Json
      }
      redeem_coupon_reservation: {
        Args: {
          _customer_id: string
          _discount_amount?: number
          _order_id: string
          _payment_reference?: string
          _reservation_id: string
        }
        Returns: Json
      }
      refresh_menu_item_order_counts: { Args: never; Returns: undefined }
      refresh_social_post_counts: {
        Args: { _post_id: string }
        Returns: undefined
      }
      refresh_social_profile_counts: {
        Args: { _user_id: string }
        Returns: undefined
      }
      release_coupon_reservation: {
        Args: {
          _customer_id: string
          _reason?: string
          _reservation_id: string
        }
        Returns: Json
      }
      reserve_coupon: {
        Args: {
          _cart_id?: string
          _code: string
          _customer_id: string
          _device?: string
          _ip?: string
          _lat?: number
          _lng?: number
          _user_agent?: string
        }
        Returns: Json
      }
      rider_pending_balance: { Args: { _rider_id: string }; Returns: number }
      rollback_coupon_for_order:
        | {
            Args: {
              p_actor?: string
              p_event: string
              p_order_id: string
              p_reason?: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_actor?: string
              p_device?: string
              p_event: string
              p_force?: boolean
              p_ip?: string
              p_order_id: string
              p_product_id?: string
              p_reason?: string
              p_refund_id?: string
              p_user_agent?: string
            }
            Returns: Json
          }
      save_device_token: {
        Args: { _platform?: string; _token: string; _user_id: string }
        Returns: undefined
      }
      switch_active_country: {
        Args: { _reason?: string; _to_code: string }
        Returns: Json
      }
      toggle_food_review_helpful: {
        Args: { _review_id: string }
        Returns: Json
      }
      track_ad_click: { Args: { _ad_id: string }; Returns: undefined }
      track_ad_impression: { Args: { _ad_id: string }; Returns: undefined }
      validate_coupon_code: {
        Args: {
          _cart_items: Json
          _code: string
          _customer_id: string
          _lat?: number
          _lng?: number
          _subtotal: number
        }
        Returns: Json
      }
      validate_food_coupon: {
        Args: {
          _code: string
          _customer_id: string
          _restaurant_id: string
          _subtotal: number
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "finance" | "sales" | "vendor" | "customer" | "rider"
      property_facing:
        | "north"
        | "south"
        | "east"
        | "west"
        | "north_east"
        | "north_west"
        | "south_east"
        | "south_west"
      property_furnishing: "unfurnished" | "semi_furnished" | "fully_furnished"
      property_parking: "none" | "two_wheeler" | "four_wheeler" | "both"
      property_posted_by: "owner" | "agent" | "builder"
      property_status:
        | "draft"
        | "submitted"
        | "active"
        | "rejected"
        | "paused"
        | "expired"
        | "sold"
      property_transaction_type: "rent" | "sale" | "lease" | "pg"
      property_type:
        | "apartment"
        | "independent_house"
        | "villa"
        | "plot"
        | "pg_hostel"
        | "commercial_office"
        | "commercial_shop"
        | "commercial_warehouse"
        | "commercial_showroom"
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
      app_role: ["admin", "finance", "sales", "vendor", "customer", "rider"],
      property_facing: [
        "north",
        "south",
        "east",
        "west",
        "north_east",
        "north_west",
        "south_east",
        "south_west",
      ],
      property_furnishing: ["unfurnished", "semi_furnished", "fully_furnished"],
      property_parking: ["none", "two_wheeler", "four_wheeler", "both"],
      property_posted_by: ["owner", "agent", "builder"],
      property_status: [
        "draft",
        "submitted",
        "active",
        "rejected",
        "paused",
        "expired",
        "sold",
      ],
      property_transaction_type: ["rent", "sale", "lease", "pg"],
      property_type: [
        "apartment",
        "independent_house",
        "villa",
        "plot",
        "pg_hostel",
        "commercial_office",
        "commercial_shop",
        "commercial_warehouse",
        "commercial_showroom",
      ],
    },
  },
} as const
