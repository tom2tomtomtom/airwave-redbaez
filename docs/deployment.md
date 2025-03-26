# AIrWAVE Production Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Security Configuration](#security-configuration)
3. [Environment Setup](#environment-setup)
4. [Database Configuration](#database-configuration)
5. [Deployment Process](#deployment-process)
6. [Monitoring and Maintenance](#monitoring-and-maintenance)

## Prerequisites

### Required Tools
- Node.js v18 or higher
- Docker
- AWS CLI configured with appropriate permissions
- Supabase CLI

### Access Requirements
- AWS account with necessary permissions
- Supabase project credentials
- GitHub repository access

## Security Configuration

### Supabase Security Setup
1. **Row Level Security (RLS)**
   - Ensure all tables have appropriate RLS policies
   - Verify organisation-based access controls
   ```sql
   -- Example RLS policy for assets table
   CREATE POLICY "Users can only access their organisation's assets"
   ON public.assets
   FOR ALL
   USING (organisation_id = auth.jwt() -> 'organisation_id'::text);
   ```

2. **API Security**
   - Use anon key only for public routes
   - Configure service role key for backend services
   - Enable SSL for all database connections

### Environment Variables
1. **Production Environment**
   ```plaintext
   NODE_ENV=production
   REACT_APP_SUPABASE_URL=your_production_url
   REACT_APP_SUPABASE_ANON_KEY=your_production_key
   ```

2. **Security Settings**
   ```plaintext
   REACT_APP_SECURE_COOKIE=true
   REACT_APP_CSP_ENABLED=true
   REACT_APP_MAX_FILE_SIZE=104857600
   ```

## Environment Setup

### AWS Infrastructure
1. **S3 Configuration**
   ```bash
   aws s3 mb s3://airwave-production
   aws s3api put-bucket-policy --bucket airwave-production --policy file://bucket-policy.json
   ```

2. **CloudFront Setup**
   - Create distribution for S3 bucket
   - Configure SSL certificate
   - Enable security headers

### Docker Configuration
1. **Build Production Image**
   ```bash
   docker build -t airwave-production:latest .
   ```

2. **Security Scanning**
   ```bash
   docker scan airwave-production:latest
   ```

## Database Configuration

### Supabase Setup
1. **Run Production Migrations**
   ```bash
   supabase db push
   ```

2. **Verify RLS Policies**
   ```sql
   -- Verify asset policies
   SELECT * FROM pg_policies WHERE schemaname = 'public' AND tablename = 'assets';
   ```

3. **Configure Backups**
   - Enable point-in-time recovery
   - Set up daily backups
   - Configure backup retention policy

## Deployment Process

### CI/CD Pipeline
1. **GitHub Actions Workflow**
   - Automated testing
   - Security scanning
   - Production build
   - AWS deployment

2. **Deployment Verification**
   - Health check endpoints
   - SSL certificate validation
   - Security headers verification

### Manual Deployment Steps
1. **Pre-deployment Checklist**
   ```bash
   # Build application
   npm run build

   # Run tests
   npm run test

   # Security audit
   npm audit
   ```

2. **Deployment Commands**
   ```bash
   # Deploy to S3
   aws s3 sync build/ s3://airwave-production --delete

   # Invalidate CloudFront cache
   aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*"
   ```

## Monitoring and Maintenance

### Performance Monitoring
1. **Metrics Collection**
   - Server response times
   - Asset loading times
   - User interactions
   - Error rates

2. **Alert Configuration**
   - Set up CloudWatch alarms
   - Configure error notifications
   - Monitor resource usage

### Security Maintenance
1. **Regular Updates**
   ```bash
   # Update dependencies
   npm audit fix
   npm update

   # Update security policies
   supabase db push
   ```

2. **Security Scanning**
   - Regular vulnerability assessments
   - Dependency audits
   - Access control reviews

### Backup and Recovery
1. **Backup Verification**
   - Test backup restoration monthly
   - Verify data integrity
   - Document recovery procedures

2. **Disaster Recovery**
   - Maintain recovery playbooks
   - Regular DR testing
   - Incident response procedures

## Production Checklist

### Pre-launch Verification
- [ ] All RLS policies enabled and tested
- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Security headers configured
- [ ] Monitoring tools set up
- [ ] Backup systems verified
- [ ] Load testing completed
- [ ] Error handling verified
- [ ] Documentation updated

### Post-launch Monitoring
- [ ] Monitor error rates
- [ ] Track performance metrics
- [ ] Review security logs
- [ ] Monitor resource usage
- [ ] Check backup completion
- [ ] Verify monitoring alerts

## Troubleshooting

### Common Issues
1. **Database Connection Issues**
   - Verify connection strings
   - Check RLS policies
   - Validate SSL certificates

2. **Performance Issues**
   - Review CloudWatch metrics
   - Check resource utilisation
   - Analyse slow queries

3. **Security Alerts**
   - Review audit logs
   - Check access patterns
   - Verify security policies

## Support and Maintenance

### Contact Information
- Technical Support: support@airwave.com
- Security Team: security@airwave.com
- Operations Team: ops@airwave.com

### Maintenance Windows
- Regular Updates: Sundays 02:00-04:00 UTC
- Emergency Patches: As needed with notification
- Database Maintenance: First Sunday of each month

## Security Policies

### Access Control
1. **User Authentication**
   - Multi-factor authentication required
   - Regular password rotation
   - Session management

2. **Organisation Isolation**
   - Strict data segregation
   - Organisation-based access control
   - Resource isolation

### Data Protection
1. **Encryption**
   - Data at rest encryption
   - TLS for data in transit
   - Secure key management

2. **Compliance**
   - Regular security audits
   - Compliance monitoring
   - Policy enforcement

## Performance Optimisation

### Caching Strategy
1. **Client-side Caching**
   - Asset caching
   - API response caching
   - State management

2. **Server-side Caching**
   - Query caching
   - Result caching
   - Session caching

### Resource Optimisation
1. **Asset Optimisation**
   - Image compression
   - Code minification
   - Bundle optimisation

2. **Database Optimisation**
   - Index optimisation
   - Query optimisation
   - Connection pooling
