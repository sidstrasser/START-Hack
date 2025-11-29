#!/usr/bin/env python3
"""
Standalone script to seed ChromaDB with mock negotiation data.

Usage:
    python scripts/seed_mock_data.py
"""

import sys
import os
import asyncio
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

import chromadb
from langchain_openai import OpenAIEmbeddings
from app.config import get_settings


async def seed_mock_data():
    """Seed ChromaDB with mock negotiation data."""
    print("🚀 Starting ChromaDB mock data seeding...")
    
    try:
        # Get settings
        settings = get_settings()
        print(f"✅ Settings loaded")
        print(f"📁 ChromaDB path: {settings.chroma_db_path}")
        
        # Check if OpenAI API key is set
        if not settings.openai_api_key:
            print("❌ Error: OPENAI_API_KEY not found in environment variables")
            return False
        
        # Initialize ChromaDB client
        client = chromadb.PersistentClient(path=settings.chroma_db_path)
        print("✅ ChromaDB client initialized")
        
        # Get or create the "briefings" collection
        collection = client.get_or_create_collection(
            name="briefings",
            metadata={"description": "Negotiation briefings for RAG"}
        )
        print("✅ Collection 'briefings' ready")
        
        # Initialize embeddings model
        embeddings_model = OpenAIEmbeddings(
            api_key=settings.openai_api_key,
            model="text-embedding-3-small"
        )
        print("✅ Embeddings model initialized")
        
        # Define mock data
        mock_job_id = "mock_negotiation_001"
        partner_name = "TechCorp Solutions"
        negotiation_goal = "Reduce annual contract cost by 20% while maintaining current service levels"
        
        print(f"\n📝 Creating mock data for:")
        print(f"   Partner: {partner_name}")
        print(f"   Goal: {negotiation_goal}")
        print(f"   Job ID: {mock_job_id}")
        
        # Create document chunks
        chunks = []
        metadatas = []
        ids = []
        
        # Chunk 1: Executive Summary
        executive_summary = f"""Executive Summary:

This briefing covers the upcoming negotiation with {partner_name}, a technology solutions provider. 
Our primary objective is to {negotiation_goal}. 

{partner_name} has been our primary IT services vendor for the past 3 years, providing cloud infrastructure, 
support services, and software licensing. The current contract is set to expire in 6 months, presenting 
an opportunity to renegotiate terms.

Key focus areas for this negotiation include cost reduction, service level maintenance, and contract flexibility."""
        
        chunks.append(executive_summary)
        metadatas.append({"job_id": mock_job_id, "section": "executive_summary"})
        ids.append(f"{mock_job_id}_exec_summary")
        
        # Chunk 2: Supplier Overview
        supplier_overview = f"""Supplier Overview:

Company: {partner_name}
Industry: Technology Solutions & IT Services
Relationship Duration: 3 years
Current Contract Value: $2.5M annually
Contract Expiry: 6 months

Company Profile:
{partner_name} is a mid-sized technology solutions provider specializing in cloud infrastructure, 
enterprise software licensing, and managed IT services. They serve approximately 200 clients 
across various industries.

Key Services Provided:
- Cloud infrastructure hosting and management
- Enterprise software licensing (Microsoft, Oracle, etc.)
- 24/7 technical support and helpdesk services
- Security and compliance consulting

Strengths:
- Reliable service delivery with 99.9% uptime SLA
- Strong technical expertise in cloud technologies
- Responsive customer support team

Areas of Concern:
- Pricing has increased 15% over the past 3 years
- Limited flexibility in contract terms
- Some services could be consolidated or optimized"""
        
        chunks.append(supplier_overview)
        metadatas.append({"job_id": mock_job_id, "section": "supplier_overview"})
        ids.append(f"{mock_job_id}_supplier")
        
        # Chunk 3: Negotiation Strategy
        negotiation_strategy = f"""Negotiation Strategy:

Primary Goal: {negotiation_goal}

Strategic Approach:
1. Cost Reduction Focus:
   - Target 20% reduction in annual contract value
   - Explore volume discounts for multi-year commitment
   - Identify services that can be optimized or consolidated
   - Negotiate better pricing tiers based on usage patterns

2. Value Preservation:
   - Maintain current service level agreements (SLAs)
   - Ensure no reduction in support quality
   - Preserve existing security and compliance standards

3. Contract Terms:
   - Propose 3-year contract extension with annual review clauses
   - Include performance-based pricing adjustments
   - Add flexibility for service modifications

4. Leverage Points:
   - Long-term partnership history (3 years)
   - Potential for expanded services in future
   - Competitive market with alternative providers available
   - Current contract expiration provides negotiation window

5. Risk Mitigation:
   - Have backup vendor options identified
   - Prepare transition plan if negotiation fails
   - Maintain professional relationship regardless of outcome"""
        
        chunks.append(negotiation_strategy)
        metadatas.append({"job_id": mock_job_id, "section": "negotiation_strategy"})
        ids.append(f"{mock_job_id}_strategy")
        
        # Chunk 4: Key Talking Points
        key_talking_points = f"""Key Talking Points:

Opening Statements:
- We value our 3-year partnership with {partner_name} and appreciate the quality service you've provided.
- As we approach contract renewal, we'd like to discuss opportunities to optimize our arrangement.

Cost Discussion:
- We're looking to achieve a 20% reduction in our annual contract cost while maintaining service quality.
- We've analyzed our usage patterns and believe there are opportunities for cost optimization.
- A multi-year commitment could justify better pricing terms.

Value Proposition:
- We're committed to a long-term partnership and willing to extend the contract for 3 years.
- We're also exploring opportunities to expand services, which could increase overall contract value.
- Our goal is a win-win arrangement that benefits both parties.

Service Quality:
- We want to maintain our current service levels and SLAs.
- We're open to discussing service optimizations that could reduce costs without impacting quality.

Closing Points:
- We'd like to finalize terms within the next 30 days to ensure smooth transition.
- We're prepared to move forward quickly once we reach mutually agreeable terms."""
        
        chunks.append(key_talking_points)
        metadatas.append({"job_id": mock_job_id, "section": "talking_points"})
        ids.append(f"{mock_job_id}_talking_points")
        
        # Chunk 5: Negotiation Goal (explicit section)
        negotiation_goal_section = f"""Negotiation Goal:

Primary Objective: {negotiation_goal}

Specific Targets:
- Reduce annual contract cost from $2.5M to $2.0M (20% reduction)
- Maintain all current service levels and SLAs
- Secure 3-year contract extension with favorable terms
- Include annual review and adjustment clauses

Success Criteria:
- Achieve at least 15% cost reduction (minimum acceptable)
- No degradation in service quality or SLAs
- Contract terms that provide flexibility for future needs
- Maintained positive relationship with {partner_name}

Timeline:
- Target completion: Within 30 days
- Contract renewal deadline: 6 months from now
- Implementation: Immediate upon agreement"""
        
        chunks.append(negotiation_goal_section)
        metadatas.append({"job_id": mock_job_id, "section": "negotiation_goal"})
        ids.append(f"{mock_job_id}_goal")
        
        print(f"\n📊 Generated {len(chunks)} document chunks")
        
        # Generate embeddings
        print("🔄 Generating embeddings...")
        embeddings = await embeddings_model.aembed_documents(chunks)
        print(f"✅ Generated {len(embeddings)} embeddings")
        
        # Store in ChromaDB
        print("💾 Storing data in ChromaDB...")
        collection.add(
            documents=chunks,
            embeddings=embeddings,
            metadatas=metadatas,
            ids=ids
        )
        print("✅ Data stored successfully")
        
        # Verify data was stored
        print("\n🔍 Verifying stored data...")
        results = collection.get(ids=ids)
        stored_count = len(results['ids'])
        
        if stored_count == len(ids):
            print(f"✅ Verification successful: {stored_count} documents stored")
        else:
            print(f"⚠️  Warning: Expected {len(ids)} documents, found {stored_count}")
        
        # Print summary
        print("\n" + "="*60)
        print("📋 SUMMARY")
        print("="*60)
        print(f"Job ID: {mock_job_id}")
        print(f"Partner: {partner_name}")
        print(f"Negotiation Goal: {negotiation_goal}")
        print(f"Documents stored: {stored_count}")
        print(f"Collection: briefings")
        print("="*60)
        print("\n✅ Mock data seeding completed successfully!")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Error during seeding: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = asyncio.run(seed_mock_data())
    sys.exit(0 if success else 1)

