DO $outer$ DECLARE definition text; BEGIN
 SELECT pg_get_functiondef('public.erp_checkout(uuid,jsonb)'::regprocedure) INTO definition;
 definition:=replace(definition,'email text;','customer_email_value text;');
 definition:=replace(definition,'email:=lower','customer_email_value:=lower');
 definition:=replace(definition,'IF email IS NULL OR email !~','IF customer_email_value IS NULL OR customer_email_value !~');
 definition:=replace(definition,'hashtext(email)','hashtext(customer_email_value)');
 definition:=replace(definition,'WHERE lower(email)=email','WHERE lower(ecommerce_customers.email)=customer_email_value');
 definition:=replace(definition,'VALUES(auth.uid(),email,uname','VALUES(auth.uid(),customer_email_value,uname');
 definition:=replace(definition,',uname,''customer'',email)',',uname,''customer'',customer_email_value)');
 definition:=replace(definition,',loc,uname,email,p_request',',loc,uname,customer_email_value,p_request');
 definition:=replace(definition,'IF p_key IS NULL','IF auth.uid() IS NULL THEN RAISE EXCEPTION ''Sign in before checkout''; END IF; IF p_key IS NULL');
 definition:=replace(definition,'IF c.id IS NULL THEN SELECT * INTO c FROM public.ecommerce_customers WHERE lower(ecommerce_customers.email)=customer_email_value FOR UPDATE; END IF;', 'IF c.id IS NULL THEN SELECT * INTO c FROM public.ecommerce_customers WHERE lower(ecommerce_customers.email)=customer_email_value FOR UPDATE; IF c.user_id IS NOT NULL AND c.user_id<>auth.uid() THEN RAISE EXCEPTION ''Customer ownership mismatch''; END IF; END IF;');
 EXECUTE definition;
END $outer$;