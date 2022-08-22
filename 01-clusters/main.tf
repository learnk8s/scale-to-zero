module "eu" {
  source = "../modules/cluster"

  name   = "eu"
  region = "eu-west"
}

resource "local_file" "kubeconfig_eu" {
  filename = "../kubeconfig"
  content  = module.eu.kubeconfig
}
