# Dry Cleaning and Laundry Services Smart Contract System

A comprehensive blockchain-based system for managing dry cleaning and laundry services built on the Stacks blockchain using Clarity smart contracts.

## System Overview

This system provides a complete solution for dry cleaning and laundry businesses, enabling:

- **Pickup and Delivery Management**: Schedule and coordinate service appointments
- **Garment Care Tracking**: Detailed care instructions and special handling requirements
- **Transparent Pricing**: Clear pricing structure with damage protection
- **Subscription Services**: Recurring service plans and bulk processing discounts
- **Eco-Friendly Programs**: Sustainability tracking and green cleaning options

## Smart Contracts

### 1. Service Management (`service-management.clar`)
- Core service creation and management
- Pickup and delivery scheduling
- Service status tracking
- Customer service history

### 2. Garment Care (`garment-care.clar`)
- Garment registration and care instructions
- Special handling requirements
- Damage tracking and protection
- Care history and recommendations

### 3. Pricing System (`pricing-system.clar`)
- Dynamic pricing based on service type
- Bulk processing discounts
- Damage protection fees
- Transparent cost calculation

### 4. Subscription Manager (`subscription-manager.clar`)
- Recurring service subscriptions
- Subscription tier management
- Automatic billing and renewals
- Subscription benefits tracking

### 5. Eco Program (`eco-program.clar`)
- Sustainability program management
- Eco-friendly service tracking
- Carbon footprint calculation
- Green incentives and rewards

## Key Features

### Service Management
- Create and manage cleaning services
- Schedule pickup and delivery times
- Track service progress and completion
- Maintain customer service history

### Garment Care
- Register garments with specific care requirements
- Track special handling needs (delicate, stain removal, etc.)
- Damage protection and insurance claims
- Care recommendation system

### Pricing Transparency
- Clear, upfront pricing for all services
- Bulk processing discounts
- Damage protection options
- No hidden fees policy

### Subscription Services
- Monthly and annual subscription plans
- Tiered service levels (Basic, Premium, VIP)
- Automatic renewals and billing
- Subscriber-only benefits and discounts

### Eco-Friendly Programs
- Green cleaning service options
- Sustainability tracking and reporting
- Carbon footprint reduction initiatives
- Eco-friendly incentives and rewards

## Data Structures

### Service Record
- Service ID and customer information
- Pickup/delivery scheduling
- Service type and requirements
- Status tracking and completion

### Garment Profile
- Garment identification and categorization
- Care instructions and handling requirements
- Damage history and protection status
- Cleaning recommendations

### Subscription Plan
- Plan type and billing cycle
- Service allowances and benefits
- Renewal dates and payment status
- Usage tracking and limits

## Getting Started

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Run tests:
   \`\`\`bash
   npm test
   \`\`\`

3. Deploy contracts:
   \`\`\`bash
   clarinet deploy
   \`\`\`

## Testing

The system includes comprehensive tests using Vitest:
- Unit tests for each contract function
- Integration tests for cross-contract interactions
- Edge case and error handling tests
- Performance and gas optimization tests

## Security Features

- Input validation and sanitization
- Access control and authorization
- Damage protection and insurance
- Secure payment processing
- Data privacy and protection

## Business Benefits

- **Operational Efficiency**: Streamlined service management
- **Customer Trust**: Transparent pricing and damage protection
- **Revenue Growth**: Subscription services and bulk processing
- **Sustainability**: Eco-friendly programs and tracking
- **Scalability**: Blockchain-based infrastructure

## Technical Architecture

Built on Stacks blockchain using Clarity smart contracts:
- Immutable service records
- Transparent pricing algorithms
- Decentralized subscription management
- Trustless damage protection
- Automated eco-program tracking

## Support and Documentation

For detailed API documentation, deployment guides, and troubleshooting:
- Contract documentation in `/docs`
- Test examples in `/tests`
- Configuration files for easy setup
