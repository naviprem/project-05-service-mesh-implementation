# K8S Setup

- Setup Kubernetes Cluster using Minikube (Local)

```bash

# Delete any existing cluster
minikube delete

# Start minikube
# minikube start --driver=docker --cpus=2 --memory=4096
minikube start --driver=docker --cpus=4 --memory=8192

# Verify it's working
minikube status

# Open minikube dashboard
minikube dashboard

# Enable registry addon to push images - Optional
minikube addons enable registry
# for this project, you don't need to push to a registry. You can use Minikube's Docker daemon directly:
# Use minikube's docker daemon
eval $(minikube docker-env)

# Rebuild images in minikube
cd services/product-service && docker build -t product-service:v1 .
cd ../cart-service && docker build -t cart-service:v1 .
cd ../user-service && docker build -t user-service:v1 .
cd ../order-service && docker build -t order-service:v1 .

# Commands to build images for AMD64 architecture
cd services/product-service 
docker buildx build --platform linux/amd64 -t product-service:v1 .

cd ../cart-service
docker buildx build --platform linux/amd64 -t cart-service:v1 .

cd ../user-service
docker buildx build --platform linux/amd64 -t user-service:v1 .

cd ../order-service 
docker buildx build --platform linux/amd64 -t order-service:v1 .
```

- Verify kubectl current context

```bash
kubectl config current-context
# Should return minikube

# Additional commands to inspect the cluster
kubectl get nodes
kubectl cluster-info
kubectl config get-contexts
kubectl config use-context <context-name>
```

- Deploy services

```bash
cd k8s

# Create namespace (optional)
kubectl create namespace ecommerce

# Deploy all services
kubectl apply -f . -n ecommerce

# To apply individual files
kubectl apply -f order-deployment.yaml -n ecommerce
```

- Verify Deployment

```bash
# Check pods (should see 2 replicas of each service)
kubectl get pods -n ecommerce

# Check services
kubectl get svc -n ecommerce

# Check logs
kubectl logs -f deployment/product-service -n ecommerce
```

- Test Service Communication

```bash
# Start a test pod
kubectl run test --rm -it --image=curlimages/curl --namespace ecommerce -- sh

kubectl exec -it test -n ecommerce -- sh

# Inside the test pod, run:
curl http://product-service:3001/health
curl http://product-service:3001/products

curl http://cart-service:3002/health
curl -X POST -H "Content-Type: application/json" -d '{"product_id": 1, "quantity": 2}' http://cart-service:3002/cart/1
curl http://cart-service:3002/cart/1

curl http://user-service:3004/users/1
curl http://user-service:3004/users/2

curl -X POST -H "Content-Type: application/json" -d '{"user_id": "1"}' http://order-service:3003/orders
curl http://order-service:3003/orders/1

```

- Clean Up (if needed)

```bash
# Delete all resources
kubectl delete -f . -n ecommerce

# Delete namespace
kubectl delete namespace ecommerce

# Stop minikube (local only)
minikube stop

# Delete EKS cluster (AWS only)
eksctl delete cluster --name servicemesh-demo --region us-east-1
```

- Test script

```bash
kubectl run test-curl --rm -it --image=curlimages/curl --namespace ecommerce -- sh -c '
echo "=== Testing Product Service ==="
echo "1. Health check:"
curl -s http://product-service:3001/health
echo -e "\n"

echo "2. Get all products:"
curl -s http://product-service:3001/products
echo -e "\n"

echo "3. Get single product (ID 1):"
curl -s http://product-service:3001/products/1
echo -e "\n\n"

echo "=== Testing Cart Service ==="
echo "4. Health check:"
curl -s http://cart-service:3002/health
echo -e "\n"

echo "5. Get empty cart for user1:"
curl -s http://cart-service:3002/cart/user1
echo -e "\n"

echo "6. Add product 1 to cart:"
curl -s -X POST -H "Content-Type: application/json" -d "{\"product_id\":1,\"quantity\":2}" http://cart-service:3002/cart/user1
echo -e "\n"

echo "7. Add product 2 to cart:"
curl -s -X POST -H "Content-Type: application/json" -d "{\"product_id\":2,\"quantity\":1}" http://cart-service:3002/cart/user1
echo -e "\n"

echo "8. Get cart with enriched product data:"
curl -s http://cart-service:3002/cart/user1
echo -e "\n\n"

echo "=== Testing User Service ==="
echo "9. Health check:"
curl -s http://user-service:3004/health
echo -e "\n"

echo "10. Get all users:"
curl -s http://user-service:3004/users
echo -e "\n"

echo "11. Get single user (ID 1):"
curl -s http://user-service:3004/users/1
echo -e "\n\n"

echo "=== Testing Order Service ==="
echo "12. Health check:"
curl -s http://order-service:3003/health
echo -e "\n"

echo "13. Get all orders:"
curl -s http://order-service:3003/orders/1
echo -e "\n"

echo "=== All tests completed ==="
'
```
