provider "aws" {
  profile = "default"
  region = "us-east-1"
}

terraform {
  backend "s3" {
    bucket = "tfstate-digitalis"
    key = "state"
    region = "us-west-1"
  }
}

resource "aws_s3_bucket" "digitalis_repository" {
    bucket = "digitalis-repo-20200919"
    acl    = "private"
}

resource "aws_s3_bucket_object" "index_page" {
    bucket = aws_s3_bucket.digitalis_repository.bucket
    key = "index.html"
    source = "index.html"
    etag = filemd5("index.html")
}

resource "aws_s3_bucket_object" "package_key" {
    bucket = aws_s3_bucket.digitalis_repository.bucket
    key = "package_key.pem"
    source = "package_key.pem"
    etag = filemd5("package_key.pem")
}

resource "aws_cloudfront_origin_access_identity" "oai" {
    comment = "digitalis"
}

data "aws_iam_policy_document" "s3_policy" {
  statement {
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.digitalis_repository.arn}/*"]

    principals {
      type        = "AWS"
      identifiers = [aws_cloudfront_origin_access_identity.oai.iam_arn]
    }
  }
}

resource "aws_s3_bucket_policy" "s3_bucket_policy" {
  bucket = aws_s3_bucket.digitalis_repository.id
  policy = data.aws_iam_policy_document.s3_policy.json
}

data "aws_route53_zone" "zone" {
  name         = "m0rg.dev."
  private_zone = false
}

resource "aws_acm_certificate" "cert" {
  domain_name       = "digitalis-repo.m0rg.dev"
  validation_method = "DNS"
}

resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.cert.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.zone.zone_id
}

resource "aws_acm_certificate_validation" "cert" {
  certificate_arn         = aws_acm_certificate.cert.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

resource "aws_cloudfront_distribution" "repo_distribution" {
  origin {
    domain_name = aws_s3_bucket.digitalis_repository.bucket_regional_domain_name
    origin_id   = "digitalis_s3"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.oai.cloudfront_access_identity_path
    }
  }

  aliases             = [aws_acm_certificate.cert.domain_name]
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "Some comment"
  default_root_object = "index.html"

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "digitalis_s3"

    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "https-only"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }

  price_class = "PriceClass_100"
  viewer_certificate {
    acm_certificate_arn = aws_acm_certificate.cert.arn
    ssl_support_method = "sni-only"
  }
  restrictions {
      geo_restriction {
          restriction_type = "none"
      }
  }
}

output "distribution_dns" {
    value = aws_cloudfront_distribution.repo_distribution.domain_name
}

output "s3_backing_store" {
  value = aws_s3_bucket.digitalis_repository.bucket
}

resource "aws_route53_record" "cf_record" {
  name = aws_acm_certificate.cert.domain_name
  ttl = 60
  type = "CNAME"
  zone_id = data.aws_route53_zone.zone.zone_id
  records = [
    aws_cloudfront_distribution.repo_distribution.domain_name
  ]
}