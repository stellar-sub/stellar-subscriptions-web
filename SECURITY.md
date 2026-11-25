# Security Policy

## Supported Versions

We actively maintain and provide security fixes for the latest released version of this project. Older versions may not receive security updates. If you are running an older version, we recommend upgrading to the latest release before reporting an issue.

| Version | Supported          |
| ------- | ------------------ |
| Latest  | :white_check_mark: |
| Older   | :x:                |

## Reporting a Vulnerability

We take the security of this project seriously. If you believe you have found a security vulnerability, please report it to us responsibly. **Please do not open a public GitHub issue, pull request, or discuss the vulnerability publicly** until we have had a chance to address it.

You can report a vulnerability through either of the following channels:

1. **GitHub Private Security Advisory (preferred):** Use the [Report a vulnerability](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability) feature under the **Security** tab of this repository. This keeps the report private and gives us a structured way to collaborate with you.
2. **Email:** Send your report to the maintainers at **[INSERT SECURITY CONTACT EMAIL]**. If possible, encrypt sensitive details using our PGP key (see below).

### What to Include in Your Report

To help us triage and resolve the issue quickly, please include as much of the following as possible:

- A description of the vulnerability and its potential impact.
- The affected component(s) and version(s).
- Step-by-step reproduction instructions or a proof-of-concept (PoC).
- Any relevant logs, screenshots, or transaction hashes.
- Your assessment of severity (e.g., using [CVSS](https://www.first.org/cvss/)).
- Whether you intend to disclose the issue publicly, and any proposed timeline.
- How you would like to be credited (name, handle, or anonymous).

### PGP Key

If you prefer encrypted email, please use our PGP key:

```
[INSERT PGP PUBLIC KEY BLOCK]
```

## Response SLA

We are committed to responding to security reports in a timely manner. Our target timelines are:

| Stage                                   | Target Timeframe              |
| --------------------------------------- | ----------------------------- |
| Acknowledgement of report               | Within **3 business days**    |
| Initial triage and severity assessment  | Within **7 business days**    |
| Status update / remediation plan        | Within **14 business days**   |
| Fix or mitigation for critical issues   | As soon as reasonably possible |

These are targets, not guarantees. Complex issues may require additional time, and we will keep you informed of our progress throughout the process. We will coordinate disclosure timing with you and aim to publish an advisory once a fix is available.

## Scope

### In Scope

- **Smart contracts:** Solidity (or equivalent) contracts, including deployment scripts and upgrade mechanisms.
- **Application:** The web/application front-end, backend services, and APIs in this repository.
- **Wallet integration:** Wallet connection flows, transaction signing, key handling, and related integration code.

### Out of Scope

- Vulnerabilities in third-party dependencies that are already publicly disclosed and have an available upstream fix (please report those upstream).
- Issues requiring physical access to a device or that rely on a compromised user environment.
- Social engineering, phishing, or spam attacks against maintainers or users.
- Denial-of-service attacks that rely on unrealistic resource consumption or rate-limit abuse without a demonstrable security impact.
- Reports generated solely by automated scanners without a demonstrated, exploitable impact.
- Best-practice or informational findings without a concrete security impact (e.g., missing security headers with no exploit path).
- Vulnerabilities in test networks, test data, or example code that is clearly marked as non-production.

If you are unsure whether something is in scope, please reach out — we would rather hear about it.

## Safe Harbour

We consider security research conducted in good faith to be a valuable contribution to the project and the wider community. If you make a good-faith effort to comply with this policy during your research, we will:

- Consider your research to be authorized, and we will not initiate or support legal action against you for accidental, good-faith violations of this policy.
- Work with you to understand and resolve the issue quickly.
- Recognize your contribution publicly (with your permission) once the issue is resolved.

This safe harbour applies only to research that:

- Is conducted in good faith and in compliance with this policy and applicable law.
- Does not exploit the vulnerability beyond what is necessary to demonstrate it.
- Does not access, modify, or exfiltrate data belonging to others.
- Does not degrade, disrupt, or deny service to other users or systems.
- Is reported to us privately and given reasonable time to be addressed before any public disclosure.

This safe harbour does not waive any legal rights or obligations of the project, and it does not apply to activities that are unlawful or that violate the rights of third parties.

## Thank You

We are grateful to the security researchers and community members who help keep this project and its users safe. Responsible disclosure makes a real difference, and we appreciate your efforts.

---

For general (non-security) questions, please see our [Code of Conduct](CODE_OF_CONDUCT.md) and [README](README.md).