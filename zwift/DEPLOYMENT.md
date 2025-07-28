# AI Chatbot Deployment Guide

## Prerequisites

1. **OpenAI API Key**: Get from [OpenAI Platform](https://platform.openai.com/api-keys)
2. **Supabase Project**: Create at [Supabase](https://supabase.com)
3. **Vercel Account**: Sign up at [Vercel](https://vercel.com)

## Environment Variables Setup

Create a `.env.local` file in your project root:

\`\`\`env
OPENAI_API_KEY=sk-your-openai-api-key-here
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
\`\`\`

## Database Schema Requirements

Your Supabase database should have these tables:

### Products Table
\`\`\`sql
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  barcode TEXT,
  stock INTEGER DEFAULT 0,
  min_stock INTEGER DEFAULT 0,
  price DECIMAL(10,2) DEFAULT 0,
  purchase_price DECIMAL(10,2),
  category_id UUID REFERENCES categories(id),
  image TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
\`\`\`

### Categories Table
\`\`\`sql
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);
\`\`\`

### Sales Table
\`\`\`sql
CREATE TABLE sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  total DECIMAL(10,2) NOT NULL,
  payment_method TEXT DEFAULT 'cash',
  created_at TIMESTAMP DEFAULT NOW()
);
\`\`\`

### Sale Items Table
\`\`\`sql
CREATE TABLE sale_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  discount DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
\`\`\`

## Deployment Steps

### 1. Deploy to Vercel

\`\`\`bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables
vercel env add OPENAI_API_KEY
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY

# Redeploy with environment variables
vercel --prod
\`\`\`

### 2. Alternative: GitHub Integration

1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically

## Testing the Deployment

1. Visit your deployed URL
2. Try these test queries:
   - "Show me products sold with zero stock in the last 7 days"
   - "Which products are running low on stock?"
   - "What are my best-selling products this month?"

## Troubleshooting

### Common Issues:

1. **OpenAI API Errors**: Check API key and billing
2. **Supabase Connection**: Verify URL and keys
3. **Database Errors**: Ensure tables exist with correct schema
4. **Rate Limits**: Using gpt-4o-mini for better limits

### Error Monitoring:

Check Vercel function logs for detailed error information.

## Production Considerations

1. **Rate Limiting**: Implemented in the code
2. **Error Handling**: Comprehensive error messages
3. **Mobile Optimization**: Responsive design included
4. **Security**: Environment variables properly configured
