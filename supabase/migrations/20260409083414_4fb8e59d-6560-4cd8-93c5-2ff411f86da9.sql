CREATE UNIQUE INDEX idx_reviews_unique_user_entity 
ON public.reviews (user_id, entity_type, entity_id) 
WHERE status = 'active';