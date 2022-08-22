#! /bin/bash

kubectl apply -f 03-demo/podinfo.yaml
kubectl apply -f 03-demo/scaled-object.yaml
kubectl apply -f 03-demo/ingress.yaml
kubectl apply -f 03-demo/locust.yaml

echo "kubectl port-forward svc/keda-add-ons-http-interceptor-proxy 8080:8080"
echo "curl localhost:8080 -H 'Host: example.com'"
