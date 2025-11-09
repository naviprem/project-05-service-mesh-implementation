# Istio Service Mesh Setup

- Install Istio with homebrew

```bash
Install Istio with Homebrew:
# Install istioctl
brew install istioctl

# Verify installation
istioctl version

# Check if your cluster is ready for Istio
istioctl x precheck

# Expected output:
# ✔ No issues found when checking the cluster. Istio is safe to install or upgrade!

# Install Istio using the demo profile (includes all features)
istioctl install --set profile=demo -y
```

- **Understanding Istio Profiles:**
  - **default**: Production-ready with minimal components
  - **demo**: All features enabled, good for learning (what we're using)
  - **minimal**: Bare minimum for basic service mesh
  - **production**: Optimized for production workloads
  - **remote**: For multi-cluster deployments

- Verify Istio Installation

```bash
# Check Istio system namespace
kubectl get namespace istio-system

# Check all Istio pods
kubectl get pods -n istio-system

# Wait for all pods to be ready
kubectl wait --for=condition=Ready pods --all -n istio-system --timeout=300s

# Check Istio services
kubectl get svc -n istio-system

# Check Istio system pods
kubectl get pods -n istio-system

# Check Istio installation status
kubectl get deploy -n istio-system

```

- Get Ingress Gateway Details

```bash
# Get ingress gateway service
kubectl get svc istio-ingressgateway -n istio-system

# For NodePort (Minikube)
export INGRESS_HOST=$(minikube ip)
export INGRESS_PORT=$(kubectl get svc istio-ingressgateway -n istio-system -o jsonpath='{.spec.ports[?(@.name=="http2")].nodePort}')

# Test connectivity
echo "Gateway URL: http://$INGRESS_HOST:$INGRESS_PORT"
Gateway URL: http://192.168.49.2:31623
```

- Label Namespace for Automatic Injection

```bash
# If you created a separate namespace in Phase 1
kubectl label namespace ecommerce istio-injection=enabled

# Verify the label
kubectl get namespace -L istio-injection

```

- Redeploy Services with Sidecars

```bash
# Restart deployments to inject sidecars
kubectl rollout restart deployment -n ecommerce

# Or delete and recreate pods
kubectl delete pods --all -n ecommerce

# Watch pods restart with sidecars
kubectl get pods -n ecommerce -w

# Check pods - should see 2/2 containers (app + sidecar)
kubectl get pods -n ecommerce

# Describe a pod to see both containers
kubectl describe pod product-service-7478f7b67c-6jrlt -n ecommerce | grep "Container ID"

# Check sidecar proxy version
kubectl get pod product-service-7478f7b67c-6jrlt -n ecommerce -o jsonpath='{.spec.containers[*].name}'
# Expected: product-service istio-proxy

# View sidecar configuration
istioctl proxy-config cluster product-service-7478f7b67c-6jrlt -n ecommerce
```

- Understanding the Sidecar

```bash
# Check what the sidecar is doing
kubectl logs product-service-7478f7b67c-6jrlt -c istio-proxy -n ecommerce --tail=50

# View sidecar resource usage
kubectl top pod product-service-7478f7b67c-6jrlt -n ecommerce --containers
```

- **What the Envoy Sidecar Does:**
  - Intercepts all inbound/outbound traffic
  - Enforces routing rules
  - Collects telemetry data
  - Handles mTLS encryption
  - Applies policies (retries, circuit breakers, etc.)

---

- Install Prometheus (Metrics Collection)

```bash
# Install Prometheus
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/prometheus.yaml

# Add label to prometheus deployment
kubectl label deployment prometheus -n istio-system app.kubernetes.io/name=prometheus

# Patch prometheus deployment pod template
kubectl patch deployment prometheus -n istio-system -p '{"spec":{"template":{"metadata":{"labels":{"app.kubernetes.io/name":"prometheus"}}}}}'

# Verify installation
kubectl get pods -n istio-system -l app=prometheus

# Wait for Prometheus to be ready
kubectl wait --for=condition=Ready pod -l app=prometheus -n istio-system --timeout=300s
```

- Install Grafana (Metrics Visualization)

```bash
# Install Grafana
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/grafana.yaml

# Verify installation
kubectl get pods -n istio-system -l app=grafana

# Wait for Grafana to be ready
kubectl wait --for=condition=Ready pod -l app=grafana -n istio-system --timeout=300s
```

- Install Jaeger (Distributed Tracing)

```bash
# Install Jaeger
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/jaeger.yaml

# Verify installation
kubectl get pods -n istio-system -l app=jaeger

# Wait for Jaeger to be ready
kubectl wait --for=condition=Ready pod -l app=jaeger -n istio-system --timeout=300s
```

- Install Kiali (Service Mesh Dashboard)

```bash
# Install Kiali
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/kiali.yaml

# Verify installation
kubectl get pods -n istio-system -l app=kiali

# Wait for Kiali to be ready
kubectl wait --for=condition=Ready pod -l app=kiali -n istio-system --timeout=300s
```

- Verify All Addons

```bash
# Check all addon pods
kubectl get pods -n istio-system

# Check all services
kubectl get svc -n istio-system
```

- Access Kiali (Service Mesh Overview)

```bash
# Open Kiali dashboard
istioctl dashboard kiali

# Opens at http://localhost:20001/kiali/console/overview?duration=60&refresh=60000
```

- **What to Explore in Kiali:**
  - **Graph**: Visual representation of service communication
  - **Applications**: List of all applications in the mesh
  - **Workloads**: Deployments and their health
  - **Services**: Service details and traffic
  - **Istio Config**: Validation of Istio configurations

- Access Grafana (Metrics Dashboards)

```bash
# Open Grafana dashboard
istioctl dashboard grafana

# Access at: http://localhost:3000/?orgId=1
```

- **Pre-installed Dashboards:**
  - **Istio Service Dashboard**: Service-level metrics (request rate, latency, errors)
  - **Istio Workload Dashboard**: Pod-level metrics
  - **Istio Mesh Dashboard**: Entire mesh overview
  - **Istio Performance Dashboard**: Control plane and data plane performance

- Access Jaeger (Distributed Tracing)

```bash
# Open Jaeger UI
istioctl dashboard jaeger

# Access at: http://localhost:16686
```

- **What to Explore in Jaeger:**
  - **Search**: Find traces by service, operation, or tags
  - **Compare**: Compare trace performance
  - **Dependencies**: Service dependency graph

- Access Prometheus (Raw Metrics)

```bash
# Open Prometheus UI
istioctl dashboard prometheus

# Access at: http://localhost:9090/graph?g0.expr=&g0.tab=1&g0.stacked=0&g0.show_exemplars=0&g0.range_input=1h
```

- Useful Prometheus Queries

```promql
# Request rate per service
rate(istio_requests_total[5m])

# P95 latency
histogram_quantile(0.95, sum(rate(istio_request_duration_milliseconds_bucket[1m])) by (le))

# Error rate
sum(rate(istio_requests_total{response_code=~"5.*"}[1m])) by (destination_service_name)
```

- Generate Traffic

```bash
# Start a load generator pod
kubectl run load-generator --image=curlimages/curl --namespace ecommerce -- sleep 3600

# Generate continuous traffic
kubectl exec -it load-generator -n ecommerce -- sh

# Inside the pod, run this loop:
while true; do
  curl http://product-service:3001/products
  curl http://product-service:3001/products/1
  curl http://cart-service:3002/cart/user1
  curl -X POST -H "Content-Type: application/json" -d '{"product_id": 1, "quantity": 1}' http://cart-service:3002/cart/user1
  curl http://user-service:3004/users/1
  curl -X POST -H "Content-Type: application/json" -d '{"user_id": "1"}' http://order-service:3003/orders
  sleep 2
done
```

- Verify in Kiali
  - All services connected with arrows
  - Traffic flow animations
  - Success rates on edges
  - No red (error) indicators yet

- Verify in Grafana
  - Request volume > 0
  - Success rate ~100%
  - Latency percentiles (P50, P90, P99)
  - No 4xx or 5xx errors

- Verify in Jaeger
  - Multiple traces listed
  - Each trace shows multiple spans (service hops)
  - Timeline view of request flow
  - Spans for: product-service, cart-service, user-service, order-service

- Check Prometheus Metrics
  - Counter increasing with each request
  - Labels showing source, destination, response code

---

-Explore Istiod (Control Plane)


```bash
# Check istiod logs
kubectl logs -l app=istiod -n istio-system --tail=100

# View istiod configuration
kubectl get cm -n istio-system

# Check what istiod is managing
istioctl proxy-status

# Expected output: List of all proxies (sidecars) and their sync status
```

**Istiod Responsibilities:**
- **Pilot**: Service discovery and traffic management
- **Citadel**: Certificate management for mTLS
- **Galley**: Configuration validation and distribution

- Explore Ingress Gateway

```bash
# Check ingress gateway pods
kubectl get pods -l app=istio-ingressgateway -n istio-system

# View gateway configuration
kubectl get gateway -A

# Check gateway routes
istioctl proxy-config route istio-ingressgateway-5d4f88d5cc-gp45w.istio-system
```

- Explore Envoy Proxy Configuration

```bash
# Get a pod name
PRODUCT_POD=$(kubectl get pod -l app=product-service -n ecommerce -o jsonpath='{.items[0].metadata.name}')

# View all proxy config
istioctl proxy-config all $PRODUCT_POD -n ecommerce

# View listeners (where proxy accepts connections)
istioctl proxy-config listener $PRODUCT_POD -n ecommerce

# View routes (routing rules)
istioctl proxy-config route $PRODUCT_POD -n ecommerce

# View clusters (upstream services)
istioctl proxy-config cluster $PRODUCT_POD -n ecommerce

# View endpoints (actual pod IPs)
istioctl proxy-config endpoint $PRODUCT_POD -n ecommerce
```

- Verify Service-to-Service Communication

```bash
# Exec into a service pod
# Test calling another service
kubectl exec -it $PRODUCT_POD -c product-service -n ecommerce -- wget -O- http://cart-service:3002/health

kubectl exec -it $PRODUCT_POD -c product-service -n ecommerce -- wget -O- http://cart-service:3004/health

# Exit pod
exit
```

- Check Sidecar Interception

```bash
# Check iptables rules in sidecar (how traffic is intercepted)
kubectl exec -it $PRODUCT_POD -c istio-proxy -n ecommerce -- iptables -t nat -L -n -v

# You should see rules redirecting traffic to Envoy (port 15001)
```

- Analyze Request Path

```bash
# Generate a request and trace it
kubectl exec -it load-generator -n ecommerce -- curl -v http://product-service:3001/products

# Check Envoy access logs
kubectl logs $PRODUCT_POD -c istio-proxy -n ecommerce --tail=10

# Log format shows: source, destination, response code, duration
```

