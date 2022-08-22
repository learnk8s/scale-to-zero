module "keda" {
  source = "../modules/keda"

  kubeconfig_path = abspath("../kubeconfig")
}

output "lb_ip" {
  value = module.keda.lb_ip
}
