terraform {
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "2.12.1"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "2.6.0"
    }
  }
}

provider "kubernetes" {
  config_path = var.kubeconfig_path
}

provider "helm" {
  kubernetes {
    config_path = var.kubeconfig_path
  }
}

variable "kubeconfig_path" {
  type = string
}

locals {
  keda_namespace  = "default"
  nginx_namespace = "ingress-nginx"
}

resource "helm_release" "keda" {
  name      = "keda"
  chart     = "https://kedacore.github.io/charts/keda-2.7.2.tgz"
  namespace = local.keda_namespace
}

resource "helm_release" "http_addon" {
  name      = "http-addon"
  chart     = "https://kedacore.github.io/charts/keda-add-ons-http-0.3.0.tgz"
  namespace = local.keda_namespace
  depends_on = [
    helm_release.keda
  ]
}

resource "helm_release" "nginx" {
  name             = "nginx"
  chart            = "https://github.com/kubernetes/ingress-nginx/releases/download/helm-chart-4.2.1/ingress-nginx-4.2.1.tgz"
  namespace        = local.nginx_namespace
  create_namespace = true
}

data "kubernetes_service" "nginx_lb" {
  metadata {
    name      = "nginx-ingress-nginx-controller"
    namespace = local.nginx_namespace
  }
  depends_on = [
    helm_release.nginx
  ]
}

output "lb_ip" {
  value = data.kubernetes_service.nginx_lb.status.0.load_balancer.0.ingress.0.ip
}
