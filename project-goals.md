# Project 5: Service Mesh Implementation

## Goal
Deploy a microservices application with a service mesh to implement advanced traffic management, observability, and security features.

## Learning Objectives
- Install and configure a service mesh (Istio or Linkerd)
- Implement mutual TLS (mTLS) between services
- Configure traffic splitting and canary releases
- Set up circuit breakers and retry policies
- Configure rate limiting and fault injection
- Implement distributed tracing with Jaeger
- Monitor service mesh metrics with Prometheus and Grafana
- Understand sidecar injection patterns
- Deploy to AWS EKS

## Success Criteria
- Service mesh successfully installed and all services enrolled
- mTLS enabled for all service-to-service communication
- Traffic splitting working (e.g., 90/10 split between versions)
- Circuit breaker triggers under simulated failure conditions
- Distributed tracing shows complete request paths
- Grafana dashboards display service mesh metrics
- Successfully deployed to AWS EKS

## Tech Stack
- Service Mesh: Istio or Linkerd
- Application: Microservices app (cart, catalog, checkout, user services)
- Observability: Prometheus, Grafana, Jaeger/Zipkin
- Platform: AWS EKS
