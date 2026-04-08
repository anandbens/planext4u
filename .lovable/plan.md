
# Phase 1: Vendor Registration & Login Blockers (#4,#5,#6,#7,#8,#12,#22,#23,#34)
1. Fix vendor_applications table — ensure it exists with correct schema
2. Fix store logo upload (#4) — use vendor-assets bucket instead of kyc-documents for logos
3. Fix KYC document upload (#5) — ensure file input triggers correctly on mobile
4. Fix vendor registration submit error (#6,#12,#34) — RLS policy fix on vendor_applications
5. Fix vendor notification section (#7)
6. Fix "All" filter showing no products (#8) — status filter logic
7. Customer login only for registered users (#22) — check customers table before OTP
8. Allow customer-to-vendor registration (#23)

# Phase 2: Cart & Payment (#1, #52)
9. Cart restriction logic for same parent_product_id from different vendors (#1)
10. Fix Razorpay payment_reference_id in customer orders (#52)
11. Order detail links to seller page and product page (#52)

# Phase 3: Vendor Product & Media (#9-21)
12. CSV upload with sample format (#9)
13. Product image upload from camera/browse (#10)
14. Emoji picker (#11)
15. Category/Subcategory dropdowns (#13)
16. Parent item autocomplete (#14)
17. Variant product attributes (#15)
18. Vendor-specific media library (#16-17)
19. Cover image delete/replace (#18)
20. Fix duplicate menu items (#19)
21. Bank details spacing and save (#20)
22. Fix horizontal scroll (#21)
23. Product type variant attributes display (#24)

# Phase 4: Customer App Fixes (#25-33)
24. Location popup auto-populate (#25)
25. "No product found" message (#26)
26. Fix duplicate "Pickup where you left off" (#27)
27. Vendor wishlisting (#28)
28. Service wishlist + segregated wishlists (#29)
29. Equal grid heights (#30)
30. Empty category message (#31)
31. Product reviews (#32)
32. Buy button margin + bottom navbar overlap (#33)
33. Search no results message (#35)

# Phase 5: Socio Module (#2,#3,#36-50)
34. Fix post publishing error (#3)
35. Post creation with location, tags, products, audience, like/comment controls (#2)
36. Profile follow suggestions (#36)
37. Saved posts/reels in profile (#37,#44)
38. Real notifications (#38)
39. Contact suggestions (#39)
40. Edit profile fixes (#40-42)
41. Posts appearing in profile (#43)
42. Trending/explore (#45)
43. Reels video-only + tagging (#46)
44. Profile settings functional (#47)
45. Like/comment/repost/save functional (#48,#50)
46. Profile view from posts (#49)

# Phase 6: UI Polish (#51,#52-map)
47. Content hidden behind navbar (#51,#33)
48. UPI payment rendering (#52)
49. Map functionality fix (#52)
