TRUNCATE TABLE 
  public.reviews,
  public.customer_addresses,
  public.classified_ads,
  public.orders,
  public.products,
  public.customers,
  public.vendors,
  public.categories,
  public.areas,
  public.cities,
  public.occupations,
  public.banners,
  public.platform_variables,
  public.tax_slabs
RESTART IDENTITY CASCADE;