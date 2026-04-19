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
          created_at: string
          id: string
          name: string
          pincode: string
          status: string
        }
        Insert: {
          city_id: string
          city_name?: string
          created_at?: string
          id: string
          name: string
          pincode?: string
          status?: string
        }
        Update: {
          city_id?: string
          city_name?: string
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
          desktop_image: string
          end_date: string
          gradient: string | null
          id: string
          link: string
          mobile_image: string
          priority: number
          start_date: string
          status: string
          subtitle: string | null
          title: string
        }
        Insert: {
          created_at?: string
          desktop_image?: string
          end_date?: string
          gradient?: string | null
          id: string
          link?: string
          mobile_image?: string
          priority?: number
          start_date?: string
          status?: string
          subtitle?: string | null
          title: string
        }
        Update: {
          created_at?: string
          desktop_image?: string
          end_date?: string
          gradient?: string | null
          id?: string
          link?: string
          mobile_image?: string
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
      categories: {
        Row: {
          banner_image: string | null
          commission_rate: number | null
          count: number
          created_at: string
          description: string | null
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
          status: string
          verification_status: string | null
        }
        Insert: {
          banner_image?: string | null
          commission_rate?: number | null
          count?: number
          created_at?: string
          description?: string | null
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
          status?: string
          verification_status?: string | null
        }
        Update: {
          banner_image?: string | null
          commission_rate?: number | null
          count?: number
          created_at?: string
          description?: string | null
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
          status?: string
          verification_status?: string | null
        }
        Relationships: []
      }
      cities: {
        Row: {
          area_count: number
          created_at: string
          id: string
          name: string
          state: string
          status: string
        }
        Insert: {
          area_count?: number
          created_at?: string
          id: string
          name: string
          state: string
          status?: string
        }
        Update: {
          area_count?: number
          created_at?: string
          id?: string
          name?: string
          state?: string
          status?: string
        }
        Relationships: []
      }
      classified_ads: {
        Row: {
          area: string
          category: string
          city: string
          created_at: string
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
          created_at?: string
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
          created_at?: string
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
      customer_addresses: {
        Row: {
          address_line: string
          city: string
          created_at: string | null
          customer_id: string
          id: string
          is_default: boolean | null
          label: string
          latitude: number | null
          longitude: number | null
          pincode: string
          type: string
          updated_at: string | null
        }
        Insert: {
          address_line: string
          city?: string
          created_at?: string | null
          customer_id: string
          id?: string
          is_default?: boolean | null
          label?: string
          latitude?: number | null
          longitude?: number | null
          pincode?: string
          type?: string
          updated_at?: string | null
        }
        Update: {
          address_line?: string
          city?: string
          created_at?: string | null
          customer_id?: string
          id?: string
          is_default?: boolean | null
          label?: string
          latitude?: number | null
          longitude?: number | null
          pincode?: string
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
          created_at: string
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
          wallet_points: number
        }
        Insert: {
          about?: string | null
          area_id?: string | null
          city_id?: string | null
          created_at?: string
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
          wallet_points?: number
        }
        Update: {
          about?: string | null
          area_id?: string | null
          city_id?: string | null
          created_at?: string
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
          created_at: string
          id: string
          name: string
          state_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          state_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          state_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "districts_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["id"]
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
          cancellation_reason: string | null
          coupon_code: string | null
          created_at: string
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
          cancellation_reason?: string | null
          coupon_code?: string | null
          created_at?: string
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
          cancellation_reason?: string | null
          coupon_code?: string | null
          created_at?: string
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
      orders: {
        Row: {
          cgst_amount: number | null
          commission_source: string | null
          courier_name: string | null
          created_at: string
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
          cgst_amount?: number | null
          commission_source?: string | null
          courier_name?: string | null
          created_at?: string
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
          cgst_amount?: number | null
          commission_source?: string | null
          courier_name?: string | null
          created_at?: string
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
          created_at: string
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
          created_at?: string
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
          created_at?: string
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
          delivered_at: string | null
          distance_km: number | null
          id: string
          offered_at: string
          order_id: string
          payout_amount: number
          picked_up_at: string | null
          rejection_reason: string | null
          responded_at: string | null
          rider_id: string
          status: string
        }
        Insert: {
          delivered_at?: string | null
          distance_km?: number | null
          id?: string
          offered_at?: string
          order_id: string
          payout_amount?: number
          picked_up_at?: string | null
          rejection_reason?: string | null
          responded_at?: string | null
          rider_id: string
          status?: string
        }
        Update: {
          delivered_at?: string | null
          distance_km?: number | null
          id?: string
          offered_at?: string
          order_id?: string
          payout_amount?: number
          picked_up_at?: string | null
          rejection_reason?: string | null
          responded_at?: string | null
          rider_id?: string
          status?: string
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
          completion_notes: string | null
          completion_photo_url: string | null
          created_at: string | null
          customer_id: string
          customer_notes: string | null
          customer_pod_confirmed: boolean | null
          customer_pod_confirmed_at: string | null
          customer_pod_photo_url: string | null
          customer_rating: number | null
          customer_rating_comment: string | null
          end_time: string
          id: string
          notes: string | null
          otp_code: string | null
          otp_verified_at: string | null
          payment_status: string | null
          rated_at: string | null
          razorpay_payment_id: string | null
          service_id: string
          start_time: string
          status: string
          total_amount: number | null
          updated_at: string | null
          vendor_completion_confirmed: boolean | null
          vendor_completion_confirmed_at: string | null
          vendor_id: string
        }
        Insert: {
          assigned_vendor_name?: string | null
          booking_date: string
          completion_notes?: string | null
          completion_photo_url?: string | null
          created_at?: string | null
          customer_id: string
          customer_notes?: string | null
          customer_pod_confirmed?: boolean | null
          customer_pod_confirmed_at?: string | null
          customer_pod_photo_url?: string | null
          customer_rating?: number | null
          customer_rating_comment?: string | null
          end_time: string
          id?: string
          notes?: string | null
          otp_code?: string | null
          otp_verified_at?: string | null
          payment_status?: string | null
          rated_at?: string | null
          razorpay_payment_id?: string | null
          service_id: string
          start_time: string
          status?: string
          total_amount?: number | null
          updated_at?: string | null
          vendor_completion_confirmed?: boolean | null
          vendor_completion_confirmed_at?: string | null
          vendor_id: string
        }
        Update: {
          assigned_vendor_name?: string | null
          booking_date?: string
          completion_notes?: string | null
          completion_photo_url?: string | null
          created_at?: string | null
          customer_id?: string
          customer_notes?: string | null
          customer_pod_confirmed?: boolean | null
          customer_pod_confirmed_at?: string | null
          customer_pod_photo_url?: string | null
          customer_rating?: number | null
          customer_rating_comment?: string | null
          end_time?: string
          id?: string
          notes?: string | null
          otp_code?: string | null
          otp_verified_at?: string | null
          payment_status?: string | null
          rated_at?: string | null
          razorpay_payment_id?: string | null
          service_id?: string
          start_time?: string
          status?: string
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
          status: string
          verification_status: string | null
        }
        Insert: {
          banner_image?: string | null
          commission_rate?: number | null
          count?: number
          created_at?: string
          description?: string | null
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
          status?: string
          verification_status?: string | null
        }
        Update: {
          banner_image?: string | null
          commission_rate?: number | null
          count?: number
          created_at?: string
          description?: string | null
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
          created_at: string
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
          created_at?: string
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
          created_at?: string
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
          booking_duration_minutes: number | null
          category_id: string | null
          category_name: string | null
          created_at: string
          description: string
          discount: number
          duration: string | null
          emoji: string | null
          id: string
          image: string | null
          images: Json | null
          long_description: string | null
          max_bookings_per_slot: number | null
          max_points_redeemable: number
          meta_description: string | null
          meta_title: string | null
          price: number
          pricing_slots: Json | null
          rating: number | null
          reviews: number | null
          service_area: string | null
          short_description: string | null
          slug: string | null
          status: string
          tax: number
          title: string
          updated_at: string | null
          vendor_id: string
          vendor_name: string | null
        }
        Insert: {
          booking_duration_minutes?: number | null
          category_id?: string | null
          category_name?: string | null
          created_at?: string
          description?: string
          discount?: number
          duration?: string | null
          emoji?: string | null
          id: string
          image?: string | null
          images?: Json | null
          long_description?: string | null
          max_bookings_per_slot?: number | null
          max_points_redeemable?: number
          meta_description?: string | null
          meta_title?: string | null
          price?: number
          pricing_slots?: Json | null
          rating?: number | null
          reviews?: number | null
          service_area?: string | null
          short_description?: string | null
          slug?: string | null
          status?: string
          tax?: number
          title: string
          updated_at?: string | null
          vendor_id: string
          vendor_name?: string | null
        }
        Update: {
          booking_duration_minutes?: number | null
          category_id?: string | null
          category_name?: string | null
          created_at?: string
          description?: string
          discount?: number
          duration?: string | null
          emoji?: string | null
          id?: string
          image?: string | null
          images?: Json | null
          long_description?: string | null
          max_bookings_per_slot?: number | null
          max_points_redeemable?: number
          meta_description?: string | null
          meta_title?: string | null
          price?: number
          pricing_slots?: Json | null
          rating?: number | null
          reviews?: number | null
          service_area?: string | null
          short_description?: string | null
          slug?: string | null
          status?: string
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
          commission: number
          created_at: string
          id: string
          net_amount: number
          order_id: string
          rejection_reason: string | null
          settled_at: string | null
          status: string
          transaction_reference: string | null
          vendor_id: string
          vendor_name: string | null
        }
        Insert: {
          amount?: number
          commission?: number
          created_at?: string
          id: string
          net_amount?: number
          order_id: string
          rejection_reason?: string | null
          settled_at?: string | null
          status?: string
          transaction_reference?: string | null
          vendor_id: string
          vendor_name?: string | null
        }
        Update: {
          amount?: number
          commission?: number
          created_at?: string
          id?: string
          net_amount?: number
          order_id?: string
          rejection_reason?: string | null
          settled_at?: string | null
          status?: string
          transaction_reference?: string | null
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
          collab_user_id: string | null
          comment_count: number | null
          created_at: string | null
          hashtags: string[] | null
          hide_like_count: boolean | null
          id: string
          is_ai_generated: boolean | null
          is_collab: boolean | null
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
          collab_user_id?: string | null
          comment_count?: number | null
          created_at?: string | null
          hashtags?: string[] | null
          hide_like_count?: boolean | null
          id?: string
          is_ai_generated?: boolean | null
          is_collab?: boolean | null
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
          collab_user_id?: string | null
          comment_count?: number | null
          created_at?: string | null
          hashtags?: string[] | null
          hide_like_count?: boolean | null
          id?: string
          is_ai_generated?: boolean | null
          is_collab?: boolean | null
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
      social_stories: {
        Row: {
          audience: string | null
          background_color: string | null
          created_at: string | null
          expires_at: string
          id: string
          media_type: string | null
          media_url: string | null
          reply_count: number | null
          stickers: Json | null
          text_content: string | null
          user_id: string
          view_count: number | null
        }
        Insert: {
          audience?: string | null
          background_color?: string | null
          created_at?: string | null
          expires_at: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          reply_count?: number | null
          stickers?: Json | null
          text_content?: string | null
          user_id: string
          view_count?: number | null
        }
        Update: {
          audience?: string | null
          background_color?: string | null
          created_at?: string | null
          expires_at?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          reply_count?: number | null
          stickers?: Json | null
          text_content?: string | null
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
          created_at: string
          id: string
          name: string
          status: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          status?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          status?: string
        }
        Relationships: []
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
          created_at: string
          day_of_week: number
          id: string
          is_available: boolean
          time_slots: Json
          updated_at: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          id?: string
          is_available?: boolean
          time_slots?: Json
          updated_at?: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          id?: string
          is_available?: boolean
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
      vendors: {
        Row: {
          area_id: string | null
          background_image: string | null
          business_name: string
          category_id: string | null
          city_id: string | null
          commission_rate: number
          created_at: string
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
          created_at?: string
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
          created_at?: string
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
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      fire_push_to_user: {
        Args: {
          _body: string
          _deep_link?: string
          _title: string
          _user_id: string
        }
        Returns: undefined
      }
      get_customer_id: { Args: { _user_id: string }; Returns: string }
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
      get_rider_id: { Args: { _user_id: string }; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_vendor_id: { Args: { _user_id: string }; Returns: string }
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
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
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
      save_device_token: {
        Args: { _platform?: string; _token: string; _user_id: string }
        Returns: undefined
      }
      toggle_food_review_helpful: {
        Args: { _review_id: string }
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
