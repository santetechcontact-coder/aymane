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
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          id: string
          metadata: Json | null
          target_id: string
          target_type: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id: string
          target_type: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      blood_bank: {
        Row: {
          blood_group: Database["public"]["Enums"]["blood_group"]
          center_name: string
          city: string
          id: string
          units_available: number
          updated_at: string
        }
        Insert: {
          blood_group: Database["public"]["Enums"]["blood_group"]
          center_name: string
          city: string
          id?: string
          units_available?: number
          updated_at?: string
        }
        Update: {
          blood_group?: Database["public"]["Enums"]["blood_group"]
          center_name?: string
          city?: string
          id?: string
          units_available?: number
          updated_at?: string
        }
        Relationships: []
      }
      blood_donors: {
        Row: {
          available: boolean
          blood_group: Database["public"]["Enums"]["blood_group"]
          city: string
          created_at: string
          id: string
          last_donation_date: string | null
          user_id: string
        }
        Insert: {
          available?: boolean
          blood_group: Database["public"]["Enums"]["blood_group"]
          city: string
          created_at?: string
          id?: string
          last_donation_date?: string | null
          user_id: string
        }
        Update: {
          available?: boolean
          blood_group?: Database["public"]["Enums"]["blood_group"]
          city?: string
          created_at?: string
          id?: string
          last_donation_date?: string | null
          user_id?: string
        }
        Relationships: []
      }
      connected_devices: {
        Row: {
          active: boolean
          brand: string | null
          created_at: string
          id: string
          identifier: string | null
          last_sync_at: string | null
          name: string
          patient_id: string
          type: Database["public"]["Enums"]["device_type"]
        }
        Insert: {
          active?: boolean
          brand?: string | null
          created_at?: string
          id?: string
          identifier?: string | null
          last_sync_at?: string | null
          name: string
          patient_id: string
          type: Database["public"]["Enums"]["device_type"]
        }
        Update: {
          active?: boolean
          brand?: string | null
          created_at?: string
          id?: string
          identifier?: string | null
          last_sync_at?: string | null
          name?: string
          patient_id?: string
          type?: Database["public"]["Enums"]["device_type"]
        }
        Relationships: []
      }
      consultations: {
        Row: {
          completed_at: string | null
          consultation_type: string | null
          created_at: string
          diagnosis: string | null
          doctor_id: string | null
          follow_up_date: string | null
          follow_up_needed: boolean
          id: string
          notes: string | null
          patient_id: string
          procedures: string | null
          reason: string
          recommendations: string | null
          scheduled_at: string
          speciality: string | null
          status: Database["public"]["Enums"]["consultation_status"]
          symptoms: string | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          consultation_type?: string | null
          created_at?: string
          diagnosis?: string | null
          doctor_id?: string | null
          follow_up_date?: string | null
          follow_up_needed?: boolean
          id?: string
          notes?: string | null
          patient_id: string
          procedures?: string | null
          reason: string
          recommendations?: string | null
          scheduled_at: string
          speciality?: string | null
          status?: Database["public"]["Enums"]["consultation_status"]
          symptoms?: string | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          consultation_type?: string | null
          created_at?: string
          diagnosis?: string | null
          doctor_id?: string | null
          follow_up_date?: string | null
          follow_up_needed?: boolean
          id?: string
          notes?: string | null
          patient_id?: string
          procedures?: string | null
          reason?: string
          recommendations?: string | null
          scheduled_at?: string
          speciality?: string | null
          status?: Database["public"]["Enums"]["consultation_status"]
          symptoms?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      emergencies: {
        Row: {
          created_at: string
          description: string | null
          dispatched_at: string | null
          emergency_type: string
          id: string
          latitude: number | null
          location: string
          longitude: number | null
          patient_id: string
          public_token: string
          resolved_at: string | null
          responder_id: string | null
          severity: Database["public"]["Enums"]["emergency_severity"]
          status: Database["public"]["Enums"]["emergency_status"]
        }
        Insert: {
          created_at?: string
          description?: string | null
          dispatched_at?: string | null
          emergency_type: string
          id?: string
          latitude?: number | null
          location: string
          longitude?: number | null
          patient_id: string
          public_token?: string
          resolved_at?: string | null
          responder_id?: string | null
          severity?: Database["public"]["Enums"]["emergency_severity"]
          status?: Database["public"]["Enums"]["emergency_status"]
        }
        Update: {
          created_at?: string
          description?: string | null
          dispatched_at?: string | null
          emergency_type?: string
          id?: string
          latitude?: number | null
          location?: string
          longitude?: number | null
          patient_id?: string
          public_token?: string
          resolved_at?: string | null
          responder_id?: string | null
          severity?: Database["public"]["Enums"]["emergency_severity"]
          status?: Database["public"]["Enums"]["emergency_status"]
        }
        Relationships: []
      }
      health_alerts: {
        Row: {
          created_at: string
          id: string
          message: string
          patient_id: string
          read_at: string | null
          resolved_at: string | null
          severity: Database["public"]["Enums"]["alert_severity"]
          title: string
          unit: string | null
          value: number | null
          vital_type: Database["public"]["Enums"]["vital_type"] | null
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          patient_id: string
          read_at?: string | null
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["alert_severity"]
          title: string
          unit?: string | null
          value?: number | null
          vital_type?: Database["public"]["Enums"]["vital_type"] | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          patient_id?: string
          read_at?: string | null
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["alert_severity"]
          title?: string
          unit?: string | null
          value?: number | null
          vital_type?: Database["public"]["Enums"]["vital_type"] | null
        }
        Relationships: []
      }
      health_structures: {
        Row: {
          address: string
          city: string
          created_at: string
          description: string | null
          email: string
          id: string
          logo_url: string | null
          manager_name: string
          name: string
          owner_user_id: string
          phone_landline: string
          phone_mobile: string | null
          region: string | null
          type: Database["public"]["Enums"]["health_structure_type"]
          updated_at: string
          verified: boolean
        }
        Insert: {
          address: string
          city: string
          created_at?: string
          description?: string | null
          email: string
          id?: string
          logo_url?: string | null
          manager_name: string
          name: string
          owner_user_id: string
          phone_landline: string
          phone_mobile?: string | null
          region?: string | null
          type: Database["public"]["Enums"]["health_structure_type"]
          updated_at?: string
          verified?: boolean
        }
        Update: {
          address?: string
          city?: string
          created_at?: string
          description?: string | null
          email?: string
          id?: string
          logo_url?: string | null
          manager_name?: string
          name?: string
          owner_user_id?: string
          phone_landline?: string
          phone_mobile?: string | null
          region?: string | null
          type?: Database["public"]["Enums"]["health_structure_type"]
          updated_at?: string
          verified?: boolean
        }
        Relationships: []
      }
      insulin_injections: {
        Row: {
          created_at: string
          dose_units: number
          id: string
          injected_at: string
          injection_site: string | null
          insulin_type: string
          notes: string | null
          patient_id: string
        }
        Insert: {
          created_at?: string
          dose_units: number
          id?: string
          injected_at?: string
          injection_site?: string | null
          insulin_type: string
          notes?: string | null
          patient_id: string
        }
        Update: {
          created_at?: string
          dose_units?: number
          id?: string
          injected_at?: string
          injection_site?: string | null
          insulin_type?: string
          notes?: string | null
          patient_id?: string
        }
        Relationships: []
      }
      lab_analyses: {
        Row: {
          active: boolean
          category: string | null
          code: string
          created_at: string
          description: string | null
          id: string
          name: string
          price: number
          sample_type: string | null
          turnaround_hours: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: string | null
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          price?: number
          sample_type?: string | null
          turnaround_hours?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string | null
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          price?: number
          sample_type?: string | null
          turnaround_hours?: number
          updated_at?: string
        }
        Relationships: []
      }
      lab_request_items: {
        Row: {
          analysis_id: string
          completed_at: string | null
          created_at: string
          id: string
          reference_range: string | null
          request_id: string
          result_file_url: string | null
          result_flag: string | null
          result_notes: string | null
          result_unit: string | null
          result_value: string | null
          unit_price: number
        }
        Insert: {
          analysis_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          reference_range?: string | null
          request_id: string
          result_file_url?: string | null
          result_flag?: string | null
          result_notes?: string | null
          result_unit?: string | null
          result_value?: string | null
          unit_price?: number
        }
        Update: {
          analysis_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          reference_range?: string | null
          request_id?: string
          result_file_url?: string | null
          result_flag?: string | null
          result_notes?: string | null
          result_unit?: string | null
          result_value?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "lab_request_items_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "lab_analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_request_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "lab_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_requests: {
        Row: {
          clinical_notes: string | null
          collected_at: string | null
          completed_at: string | null
          created_at: string
          delivered_at: string | null
          doctor_id: string | null
          id: string
          internal_notes: string | null
          lab_user_id: string | null
          patient_id: string
          priority: Database["public"]["Enums"]["lab_priority"]
          scheduled_at: string | null
          status: Database["public"]["Enums"]["lab_request_status"]
          structure_id: string | null
          total: number
          updated_at: string
        }
        Insert: {
          clinical_notes?: string | null
          collected_at?: string | null
          completed_at?: string | null
          created_at?: string
          delivered_at?: string | null
          doctor_id?: string | null
          id?: string
          internal_notes?: string | null
          lab_user_id?: string | null
          patient_id: string
          priority?: Database["public"]["Enums"]["lab_priority"]
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["lab_request_status"]
          structure_id?: string | null
          total?: number
          updated_at?: string
        }
        Update: {
          clinical_notes?: string | null
          collected_at?: string | null
          completed_at?: string | null
          created_at?: string
          delivered_at?: string | null
          doctor_id?: string | null
          id?: string
          internal_notes?: string | null
          lab_user_id?: string | null
          patient_id?: string
          priority?: Database["public"]["Enums"]["lab_priority"]
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["lab_request_status"]
          structure_id?: string | null
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      medical_records: {
        Row: {
          allergies: string | null
          blood_group: Database["public"]["Enums"]["blood_group"] | null
          chronic_conditions: string | null
          created_at: string
          current_treatments: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relation: string | null
          height_cm: number | null
          id: string
          notes: string | null
          patient_id: string
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          allergies?: string | null
          blood_group?: Database["public"]["Enums"]["blood_group"] | null
          chronic_conditions?: string | null
          created_at?: string
          current_treatments?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relation?: string | null
          height_cm?: number | null
          id?: string
          notes?: string | null
          patient_id: string
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          allergies?: string | null
          blood_group?: Database["public"]["Enums"]["blood_group"] | null
          chronic_conditions?: string | null
          created_at?: string
          current_treatments?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relation?: string | null
          height_cm?: number | null
          id?: string
          notes?: string | null
          patient_id?: string
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      medications: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          price: number
          requires_prescription: boolean
          stock: number
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          price?: number
          requires_prescription?: boolean
          stock?: number
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          requires_prescription?: boolean
          stock?: number
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          read_at: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      pharmacy_order_items: {
        Row: {
          id: string
          medication_id: string
          order_id: string
          quantity: number
          unit_price: number
        }
        Insert: {
          id?: string
          medication_id: string
          order_id: string
          quantity?: number
          unit_price: number
        }
        Update: {
          id?: string
          medication_id?: string
          order_id?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_order_items_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_orders: {
        Row: {
          created_at: string
          delivery_address: string | null
          id: string
          patient_id: string
          status: Database["public"]["Enums"]["order_status"]
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivery_address?: string | null
          id?: string
          patient_id: string
          status?: Database["public"]["Enums"]["order_status"]
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivery_address?: string | null
          id?: string
          patient_id?: string
          status?: Database["public"]["Enums"]["order_status"]
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      prescriptions: {
        Row: {
          consultation_id: string | null
          created_at: string
          doctor_id: string
          dosage: string
          duration: string
          id: string
          instructions: string | null
          medication_name: string
          patient_id: string
        }
        Insert: {
          consultation_id?: string | null
          created_at?: string
          doctor_id: string
          dosage: string
          duration: string
          id?: string
          instructions?: string | null
          medication_name: string
          patient_id: string
        }
        Update: {
          consultation_id?: string | null
          created_at?: string
          doctor_id?: string
          dosage?: string
          duration?: string
          id?: string
          instructions?: string | null
          medication_name?: string
          patient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          bio: string | null
          city: string | null
          communication_pref: string | null
          created_at: string
          date_of_birth: string | null
          full_name: string | null
          gender: string | null
          id: string
          phone: string | null
          professional_address: string | null
          professional_photo_url: string | null
          region: string | null
          speciality: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          communication_pref?: string | null
          created_at?: string
          date_of_birth?: string | null
          full_name?: string | null
          gender?: string | null
          id: string
          phone?: string | null
          professional_address?: string | null
          professional_photo_url?: string | null
          region?: string | null
          speciality?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          communication_pref?: string | null
          created_at?: string
          date_of_birth?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          phone?: string | null
          professional_address?: string | null
          professional_photo_url?: string | null
          region?: string | null
          speciality?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      provider_application_reviews: {
        Row: {
          application_id: string
          created_at: string
          id: string
          opinion: string
          reason: string
          reviewer_id: string
          updated_at: string
        }
        Insert: {
          application_id: string
          created_at?: string
          id?: string
          opinion: string
          reason: string
          reviewer_id: string
          updated_at?: string
        }
        Update: {
          application_id?: string
          created_at?: string
          id?: string
          opinion?: string
          reason?: string
          reviewer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_application_reviews_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "provider_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_applications: {
        Row: {
          address: string | null
          application_type: Database["public"]["Enums"]["provider_application_type"]
          city: string | null
          created_at: string
          diploma_year: number | null
          document_approval_url: string | null
          document_cni_url: string | null
          document_cv_url: string | null
          document_diploma_url: string | null
          document_id_url: string | null
          document_legal_url: string | null
          document_manager_id_url: string | null
          document_order_url: string | null
          document_rccm_url: string | null
          email: string
          first_name: string | null
          full_name: string
          id: string
          languages: string[] | null
          last_name: string | null
          linked_structure_ids: string[] | null
          logo_url: string | null
          manager_name: string | null
          ministry_approval: string | null
          order_number: string | null
          phone: string | null
          phone_landline: string | null
          phone_mobile: string | null
          professional_address: string | null
          professional_id: string | null
          profile_photo_url: string | null
          rccm: string | null
          region: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          role_specific: Json
          services: string[] | null
          speciality: string | null
          status: Database["public"]["Enums"]["provider_application_status"]
          structure_name: string | null
          structure_role: string | null
          structure_type:
            | Database["public"]["Enums"]["health_structure_type"]
            | null
          updated_at: string
          user_id: string
          years_experience: number | null
        }
        Insert: {
          address?: string | null
          application_type: Database["public"]["Enums"]["provider_application_type"]
          city?: string | null
          created_at?: string
          diploma_year?: number | null
          document_approval_url?: string | null
          document_cni_url?: string | null
          document_cv_url?: string | null
          document_diploma_url?: string | null
          document_id_url?: string | null
          document_legal_url?: string | null
          document_manager_id_url?: string | null
          document_order_url?: string | null
          document_rccm_url?: string | null
          email: string
          first_name?: string | null
          full_name: string
          id?: string
          languages?: string[] | null
          last_name?: string | null
          linked_structure_ids?: string[] | null
          logo_url?: string | null
          manager_name?: string | null
          ministry_approval?: string | null
          order_number?: string | null
          phone?: string | null
          phone_landline?: string | null
          phone_mobile?: string | null
          professional_address?: string | null
          professional_id?: string | null
          profile_photo_url?: string | null
          rccm?: string | null
          region?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          role_specific?: Json
          services?: string[] | null
          speciality?: string | null
          status?: Database["public"]["Enums"]["provider_application_status"]
          structure_name?: string | null
          structure_role?: string | null
          structure_type?:
            | Database["public"]["Enums"]["health_structure_type"]
            | null
          updated_at?: string
          user_id: string
          years_experience?: number | null
        }
        Update: {
          address?: string | null
          application_type?: Database["public"]["Enums"]["provider_application_type"]
          city?: string | null
          created_at?: string
          diploma_year?: number | null
          document_approval_url?: string | null
          document_cni_url?: string | null
          document_cv_url?: string | null
          document_diploma_url?: string | null
          document_id_url?: string | null
          document_legal_url?: string | null
          document_manager_id_url?: string | null
          document_order_url?: string | null
          document_rccm_url?: string | null
          email?: string
          first_name?: string | null
          full_name?: string
          id?: string
          languages?: string[] | null
          last_name?: string | null
          linked_structure_ids?: string[] | null
          logo_url?: string | null
          manager_name?: string | null
          ministry_approval?: string | null
          order_number?: string | null
          phone?: string | null
          phone_landline?: string | null
          phone_mobile?: string | null
          professional_address?: string | null
          professional_id?: string | null
          profile_photo_url?: string | null
          rccm?: string | null
          region?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          role_specific?: Json
          services?: string[] | null
          speciality?: string | null
          status?: Database["public"]["Enums"]["provider_application_status"]
          structure_name?: string | null
          structure_role?: string | null
          structure_type?:
            | Database["public"]["Enums"]["health_structure_type"]
            | null
          updated_at?: string
          user_id?: string
          years_experience?: number | null
        }
        Relationships: []
      }
      provider_structures: {
        Row: {
          created_at: string
          id: string
          provider_user_id: string
          role_at_structure: string | null
          structure_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          provider_user_id: string
          role_at_structure?: string | null
          structure_id: string
        }
        Update: {
          created_at?: string
          id?: string
          provider_user_id?: string
          role_at_structure?: string | null
          structure_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_structures_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "health_structures"
            referencedColumns: ["id"]
          },
        ]
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
      video_rooms: {
        Row: {
          consultation_id: string
          created_at: string
          created_by: string
          ended_at: string | null
          id: string
          room_code: string
          started_at: string | null
        }
        Insert: {
          consultation_id: string
          created_at?: string
          created_by: string
          ended_at?: string | null
          id?: string
          room_code?: string
          started_at?: string | null
        }
        Update: {
          consultation_id?: string
          created_at?: string
          created_by?: string
          ended_at?: string | null
          id?: string
          room_code?: string
          started_at?: string | null
        }
        Relationships: []
      }
      vital_readings: {
        Row: {
          created_at: string
          id: string
          measured_at: string
          notes: string | null
          patient_id: string
          source: string
          type: Database["public"]["Enums"]["vital_type"]
          unit: string
          value: number
          value_secondary: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          measured_at?: string
          notes?: string | null
          patient_id: string
          source?: string
          type: Database["public"]["Enums"]["vital_type"]
          unit: string
          value: number
          value_secondary?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          measured_at?: string
          notes?: string | null
          patient_id?: string
          source?: string
          type?: Database["public"]["Enums"]["vital_type"]
          unit?: string
          value?: number
          value_secondary?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_provider_application: {
        Args: { _application_id: string }
        Returns: undefined
      }
      compute_profile_completeness: {
        Args: { _user_id: string }
        Returns: number
      }
      create_pharmacy_order: {
        Args: { _delivery_address?: string; _items: Json }
        Returns: string
      }
      get_emergency_public_status: {
        Args: { _token: string }
        Returns: {
          created_at: string
          dispatched_at: string
          emergency_type: string
          eta_minutes: number
          location: string
          resolved_at: string
          severity: string
          status: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      reject_provider_application: {
        Args: { _application_id: string; _reason: string }
        Returns: undefined
      }
      set_application_reviewer: {
        Args: { _enabled: boolean; _user_id: string }
        Returns: undefined
      }
      submit_provider_application_opinion: {
        Args: { _application_id: string; _opinion: string; _reason: string }
        Returns: undefined
      }
    }
    Enums: {
      alert_severity: "info" | "warning" | "critical"
      app_role:
        | "patient"
        | "doctor"
        | "pharmacist"
        | "admin"
        | "hospital"
        | "clinic"
        | "dentist"
        | "nurse"
        | "midwife"
        | "lab_technician"
        | "other_provider"
        | "application_reviewer"
      blood_group: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-"
      consultation_status:
        | "pending"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "cancelled"
      device_type:
        | "smartwatch"
        | "glucometer"
        | "oximeter"
        | "blood_pressure_monitor"
        | "scale"
        | "thermometer"
        | "other"
      emergency_severity: "low" | "medium" | "high" | "critical"
      emergency_status: "open" | "dispatched" | "resolved" | "cancelled"
      health_structure_type:
        | "hospital"
        | "clinic"
        | "medical_office"
        | "dental_office"
        | "lab"
        | "pharmacy"
        | "health_center"
        | "other"
      lab_priority: "routine" | "urgent" | "stat"
      lab_request_status:
        | "pending"
        | "sample_collection"
        | "processing"
        | "results_ready"
        | "delivered"
        | "cancelled"
      order_status:
        | "pending"
        | "paid"
        | "preparing"
        | "shipped"
        | "delivered"
        | "cancelled"
      provider_application_status: "pending" | "approved" | "rejected"
      provider_application_type:
        | "doctor"
        | "pharmacist"
        | "hospital_clinic"
        | "pharmacy_officine"
        | "dentist"
        | "nurse"
        | "midwife"
        | "lab_technician"
        | "other_provider"
        | "structure"
      vital_type:
        | "glucose"
        | "insulin"
        | "blood_pressure"
        | "heart_rate"
        | "spo2"
        | "temperature"
        | "respiratory_rate"
        | "weight"
        | "bmi"
        | "steps"
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
      alert_severity: ["info", "warning", "critical"],
      app_role: [
        "patient",
        "doctor",
        "pharmacist",
        "admin",
        "hospital",
        "clinic",
        "dentist",
        "nurse",
        "midwife",
        "lab_technician",
        "other_provider",
        "application_reviewer",
      ],
      blood_group: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
      consultation_status: [
        "pending",
        "confirmed",
        "in_progress",
        "completed",
        "cancelled",
      ],
      device_type: [
        "smartwatch",
        "glucometer",
        "oximeter",
        "blood_pressure_monitor",
        "scale",
        "thermometer",
        "other",
      ],
      emergency_severity: ["low", "medium", "high", "critical"],
      emergency_status: ["open", "dispatched", "resolved", "cancelled"],
      health_structure_type: [
        "hospital",
        "clinic",
        "medical_office",
        "dental_office",
        "lab",
        "pharmacy",
        "health_center",
        "other",
      ],
      lab_priority: ["routine", "urgent", "stat"],
      lab_request_status: [
        "pending",
        "sample_collection",
        "processing",
        "results_ready",
        "delivered",
        "cancelled",
      ],
      order_status: [
        "pending",
        "paid",
        "preparing",
        "shipped",
        "delivered",
        "cancelled",
      ],
      provider_application_status: ["pending", "approved", "rejected"],
      provider_application_type: [
        "doctor",
        "pharmacist",
        "hospital_clinic",
        "pharmacy_officine",
        "dentist",
        "nurse",
        "midwife",
        "lab_technician",
        "other_provider",
        "structure",
      ],
      vital_type: [
        "glucose",
        "insulin",
        "blood_pressure",
        "heart_rate",
        "spo2",
        "temperature",
        "respiratory_rate",
        "weight",
        "bmi",
        "steps",
      ],
    },
  },
} as const
