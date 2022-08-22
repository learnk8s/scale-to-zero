# Scaling apps to zero with Kubernetes and KEDA

This project helps you create a cluster that scale apps to zero with KEDA and the HTTP scaler.

## Getting started

You need to create a Linode token to access the API:

```bash
linode-cli profile token-create
export LINODE_TOKEN=<insert the token here>
```

```bash
# Create the cluster
terraform -chdir=01-clusters init
terraform -chdir=01-clusters apply -auto-approve

# Install KEDA & Nginx
terraform -chdir=02-keda init
terraform -chdir=02-keda apply -auto-approve

# Clean up
terraform -chdir=02-keda destroy -auto-approve
terraform -chdir=01-clusters destroy -auto-approve
```

## Demo

Make sure that your kubectl is configured with the current kubeconfig file:

```bash
export KUBECONFIG="${PWD}/kubeconfig"
```

The execute:

```bash
./test.sh
```

## Dashboard

```bash
kubectl proxy --www=./dashboard
```