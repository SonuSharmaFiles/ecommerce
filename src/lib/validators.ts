import { z } from "zod";

export const emailSchema = z.string().email("Please enter a valid email address.");
export const passwordSchema = z.string().min(8, "At least 8 characters.").max(72);
export const phoneSchema = z.string().regex(/^\+?[0-9\s().-]{6,20}$/, "Invalid phone number.");

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  full_name: z.string().min(2, "Tell us your name."),
  marketing_opt_in: z.boolean().optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password required."),
});

export const addressSchema = z.object({
  full_name: z.string().min(2),
  phone: phoneSchema.optional(),
  line1: z.string().min(2),
  line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().optional(),
  postal_code: z.string().min(2),
  country: z.string().length(2),
});

export const checkoutSchema = z.object({
  email: emailSchema,
  shipping: addressSchema,
  billing_same_as_shipping: z.boolean().default(true),
  billing: addressSchema.optional(),
  shipping_method: z.string().default("standard"),
  coupon_code: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().max(120).optional(),
  body: z.string().max(2000).optional(),
});

export const productCreateSchema = z.object({
  slug: z.string().min(2),
  title: z.string().min(2),
  description: z.string().optional(),
  base_price: z.number().min(0),
  compare_at_price: z.number().optional(),
  status: z.enum(["draft", "active", "archived", "out_of_stock"]).default("draft"),
  brand_id: z.string().uuid().optional(),
  category_ids: z.array(z.string().uuid()).optional(),
});

export const couponCreateSchema = z.object({
  code: z.string().min(3).max(40),
  type: z.enum(["percentage", "fixed_amount", "free_shipping", "buy_x_get_y"]),
  value: z.number().min(0),
  description: z.string().optional(),
  min_order_amount: z.number().optional(),
  max_discount: z.number().optional(),
  usage_limit_total: z.number().int().optional(),
  starts_at: z.string().optional(),
  expires_at: z.string().optional(),
});

export const subscribeSchema = z.object({
  email: emailSchema,
  source: z.string().optional(),
});

export const aiProductCopySchema = z.object({
  title: z.string().min(2),
  bullets: z.array(z.string()).optional(),
  audience: z.string().optional(),
  tone: z.string().optional(),
  language: z.string().optional(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
