
CREATE POLICY "Vendors read own vendor-uploads"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'vendor-uploads'
    AND (
      (storage.foldername(name))[1] = public.current_vendor_id()::text
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_finance_access(auth.uid())
    )
  );

CREATE POLICY "Vendors upload to own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'vendor-uploads'
    AND (
      (storage.foldername(name))[1] = public.current_vendor_id()::text
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_finance_access(auth.uid())
    )
  );

CREATE POLICY "Vendors delete own vendor-uploads"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'vendor-uploads'
    AND (
      (storage.foldername(name))[1] = public.current_vendor_id()::text
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_finance_access(auth.uid())
    )
  );
