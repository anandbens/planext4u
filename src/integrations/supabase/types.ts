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
          end_date: string
          id: string
          impressions: number
          placement: string
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
          end_date?: string
          id: string
          impressions?: number
          placement?: string
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
          end_date?: string
          id?: string
          impressions?: number
          placement?: string
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
      customers: {
        Row: {
          about: string | null
          area_id: string | null
          city_id: string | null
          created_at: string
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
          created_at: string
          customer_id: string
          customer_name: string | null
          delivery_rating: number | null
          discount: number
          gst_on_platform_fee: number | null
          id: string
          items: Json | null
          payment_reference_id: string | null
          platform_fee: number | null
          points_used: number
          rated_at: string | null
          rating_comment: string | null
          razorpay_order_id: string | null
          status: string
          subtotal: number
          tax: number
          total: number
          updated_at: string
          vendor_id: string
          vendor_name: string | null
        }
        Insert: {
          created_at?: string
          customer_id: string
          customer_name?: string | null
          delivery_rating?: number | null
          discount?: number
          gst_on_platform_fee?: number | null
          id: string
          items?: Json | null
          payment_reference_id?: string | null
          platform_fee?: number | null
          points_used?: number
          rated_at?: string | null
          rating_comment?: string | null
          razorpay_order_id?: string | null
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
          vendor_id: string
          vendor_name?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string
          customer_name?: string | null
          delivery_rating?: number | null
          discount?: number
          gst_on_platform_fee?: number | null
          id?: string
          items?: Json | null
          payment_reference_id?: string | null
          platform_fee?: number | null
          points_used?: number
          rated_at?: string | null
          rating_comment?: string | null
          razorpay_order_id?: string | null
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
          vendor_id?: string
          vendor_name?: string | null
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
          created_at: string
          description: string
          dimensions: Json | null
          discount: number
          discount_type: string | null
          duration_hours: number | null
          duration_minutes: number | null
          emoji: string | null
          helpline_number: string | null
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
          price: number
          product_attributes: Json | null
          product_type: string
          promise_p4u: string | null
          rating: number | null
          rejection_reason: string | null
          reviews: number | null
          sales: number | null
          short_description: string | null
          sku: string | null
          slug: string | null
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
          vendor_id: string
          vendor_name: string | null
          weight: number | null
          youtube_video_url: string | null
        }
        Insert: {
          banner_image?: string | null
          category_id?: string | null
          category_name?: string | null
          created_at?: string
          description?: string
          dimensions?: Json | null
          discount?: number
          discount_type?: string | null
          duration_hours?: number | null
          duration_minutes?: number | null
          emoji?: string | null
          helpline_number?: string | null
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
          price?: number
          product_attributes?: Json | null
          product_type?: string
          promise_p4u?: string | null
          rating?: number | null
          rejection_reason?: string | null
          reviews?: number | null
          sales?: number | null
          short_description?: string | null
          sku?: string | null
          slug?: string | null
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
          vendor_id: string
          vendor_name?: string | null
          weight?: number | null
          youtube_video_url?: string | null
        }
        Update: {
          banner_image?: string | null
          category_id?: string | null
          category_name?: string | null
          created_at?: string
          description?: string
          dimensions?: Json | null
          discount?: number
          discount_type?: string | null
          duration_hours?: number | null
          duration_minutes?: number | null
          emoji?: string | null
          helpline_number?: string | null
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
          price?: number
          product_attributes?: Json | null
          product_type?: string
          promise_p4u?: string | null
          rating?: number | null
          rejection_reason?: string | null
          reviews?: number | null
          sales?: number | null
          short_description?: string | null
          sku?: string | null
          slug?: string | null
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
          business_name: string
          category_id: string | null
          city_id: string | null
          commission_rate: number
          created_at: string
          email: string
          id: string
          membership: string
          mobile: string
          name: string
          rating: number | null
          status: string
          total_orders: number | null
          total_products: number | null
          total_revenue: number | null
        }
        Insert: {
          area_id?: string | null
          business_name?: string
          category_id?: string | null
          city_id?: string | null
          commission_rate?: number
          created_at?: string
          email?: string
          id: string
          membership?: string
          mobile?: string
          name: string
          rating?: number | null
          status?: string
          total_orders?: number | null
          total_products?: number | null
          total_revenue?: number | null
        }
        Update: {
          area_id?: string | null
          business_name?: string
          category_id?: string | null
          city_id?: string | null
          commission_rate?: number
          created_at?: string
          email?: string
          id?: string
          membership?: string
          mobile?: string
          name?: string
          rating?: number | null
          status?: string
          total_orders?: number | null
          total_products?: number | null
          total_revenue?: number | null
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
          max_points_redeemable: number
          price: number
          rating: number | null
          reviews: number | null
          service_area: string | null
          status: string
          tax: number
          title: string
          vendor_id: string
          vendor_name: string | null
        }
        Insert: {
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
          max_points_redeemable?: number
          price?: number
          rating?: number | null
          reviews?: number | null
          service_area?: string | null
          status?: string
          tax?: number
          title: string
          vendor_id: string
          vendor_name?: string | null
        }
        Update: {
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
          max_points_redeemable?: number
          price?: number
          rating?: number | null
          reviews?: number | null
          service_area?: string | null
          status?: string
          tax?: number
          title?: string
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
          settled_at: string | null
          status: string
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
          settled_at?: string | null
          status?: string
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
          settled_at?: string | null
          status?: string
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
      social_messages: {
        Row: {
          content: string | null
          conversation_id: string
          created_at: string | null
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
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
          vendor_id: string | null
        }
        Insert: {
          customer_id?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
          vendor_id?: string | null
        }
        Update: {
          customer_id?: string | null
          id?: string
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
          latitude: number | null
          longitude: number | null
          name: string
          pan_image_url: string | null
          pan_number: string | null
          phone: string
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
        }
        Insert: {
          aadhaar_back_url?: string | null
          aadhaar_front_url?: string | null
          aadhaar_number?: string | null
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
          latitude?: number | null
          longitude?: number | null
          name?: string
          pan_image_url?: string | null
          pan_number?: string | null
          phone?: string
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
        }
        Update: {
          aadhaar_back_url?: string | null
          aadhaar_front_url?: string | null
          aadhaar_number?: string | null
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
          latitude?: number | null
          longitude?: number | null
          name?: string
          pan_image_url?: string | null
          pan_number?: string | null
          phone?: string
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
          email: string
          id: string
          membership: string
          mobile: string
          name: string
          plan_end_date: string | null
          plan_id: string | null
          plan_payment_status: string
          plan_start_date: string | null
          plan_transaction_id: string | null
          rating: number | null
          shop_address: string | null
          shop_latitude: number | null
          shop_longitude: number | null
          shop_photo_url: string | null
          status: string
          total_orders: number | null
          total_products: number | null
          total_revenue: number | null
        }
        Insert: {
          area_id?: string | null
          background_image?: string | null
          business_name?: string
          category_id?: string | null
          city_id?: string | null
          commission_rate?: number
          created_at?: string
          email?: string
          id: string
          membership?: string
          mobile?: string
          name: string
          plan_end_date?: string | null
          plan_id?: string | null
          plan_payment_status?: string
          plan_start_date?: string | null
          plan_transaction_id?: string | null
          rating?: number | null
          shop_address?: string | null
          shop_latitude?: number | null
          shop_longitude?: number | null
          shop_photo_url?: string | null
          status?: string
          total_orders?: number | null
          total_products?: number | null
          total_revenue?: number | null
        }
        Update: {
          area_id?: string | null
          background_image?: string | null
          business_name?: string
          category_id?: string | null
          city_id?: string | null
          commission_rate?: number
          created_at?: string
          email?: string
          id?: string
          membership?: string
          mobile?: string
          name?: string
          plan_end_date?: string | null
          plan_id?: string | null
          plan_payment_status?: string
          plan_start_date?: string | null
          plan_transaction_id?: string | null
          rating?: number | null
          shop_address?: string | null
          shop_latitude?: number | null
          shop_longitude?: number | null
          shop_photo_url?: string | null
          status?: string
          total_orders?: number | null
          total_products?: number | null
          total_revenue?: number | null
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
      website_queries: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          phone: string
          status: string
          subject: string
        }
        Insert: {
          created_at?: string
          email?: string
          id: string
          message?: string
          name: string
          phone?: string
          status?: string
          subject?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string
          status?: string
          subject?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      are_mutual_followers: {
        Args: { _user_a: string; _user_b: string }
        Returns: boolean
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
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_customer_id: { Args: { _user_id: string }; Returns: string }
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
      is_admin_user: { Args: { _user_id: string }; Returns: boolean }
      is_conversation_participant: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
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
      refresh_social_post_counts: {
        Args: { _post_id: string }
        Returns: undefined
      }
      refresh_social_profile_counts: {
        Args: { _user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "finance" | "sales" | "vendor" | "customer"
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
      app_role: ["admin", "finance", "sales", "vendor", "customer"],
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
