-- Messages
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  content text NOT NULL CHECK (length(content) BETWEEN 1 AND 4000),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_messages_pair_created ON public.messages(sender_id, recipient_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON public.messages(recipient_id, created_at DESC);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants read messages" ON public.messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Sender creates message" ON public.messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id AND sender_id <> recipient_id);

CREATE POLICY "Recipient marks read" ON public.messages
  FOR UPDATE USING (auth.uid() = recipient_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Video rooms
CREATE TABLE IF NOT EXISTS public.video_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id uuid NOT NULL,
  room_code text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(8), 'hex'),
  created_by uuid NOT NULL,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_video_rooms_consultation ON public.video_rooms(consultation_id);

ALTER TABLE public.video_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants view room" ON public.video_rooms
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.consultations c
      WHERE c.id = video_rooms.consultation_id
        AND (c.patient_id = auth.uid() OR c.doctor_id = auth.uid())
    ) OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Doctor creates room" ON public.video_rooms
  FOR INSERT WITH CHECK (
    auth.uid() = created_by AND EXISTS (
      SELECT 1 FROM public.consultations c
      WHERE c.id = video_rooms.consultation_id
        AND (c.doctor_id = auth.uid() OR c.patient_id = auth.uid())
    )
  );

CREATE POLICY "Participants update room" ON public.video_rooms
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.consultations c
      WHERE c.id = video_rooms.consultation_id
        AND (c.patient_id = auth.uid() OR c.doctor_id = auth.uid())
    )
  );