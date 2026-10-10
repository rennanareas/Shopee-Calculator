document.getElementById("calculateBtn").addEventListener("click", async () => {
    const btn = document.getElementById("calculateBtn");
    const statusMessage = document.getElementById("statusMessage");

    const setText = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    };

    const money = cents =>
        (cents / 100).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });

    try {
        const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true
        });

        if (!tab || !tab.id) {
            alert("Não foi possível encontrar a aba atual.");
            return;
        }

        if (!tab.url || !tab.url.includes("shopee.com.br/user/purchase")) {
            alert("Por favor, abra a página 'Minhas Compras' da Shopee.");
            return;
        }

        btn.textContent = "Calculando...";
        btn.disabled = true;

        if (statusMessage) {
            statusMessage.textContent =
                "Analisando os pedidos carregados...";
            statusMessage.classList.add("visible");
        }

        chrome.scripting.executeScript(
            {
                target: { tabId: tab.id },
                func: calculateShopeeTotal
            },
            results => {
                btn.textContent = "Calcular Gastos";
                btn.disabled = false;

                if (chrome.runtime.lastError) {
                    console.error(
                        "Erro ao executar o cálculo:",
                        chrome.runtime.lastError.message
                    );

                    if (statusMessage) {
                        statusMessage.textContent =
                            "Erro ao executar o cálculo na Shopee.";
                    }

                    return;
                }

                const result = results?.[0]?.result;

                if (!result || result.error) {
                    if (statusMessage) {
                        statusMessage.textContent =
                            result?.error ||
                            "Não foi possível encontrar os pedidos.";
                    }

                    return;
                }

                setText("totalOrders", result.totalOrders);
                setText("purchasedOrders", result.purchasedOrders);

                setText(
                    "cancelledRefundedOrders",
                    result.cancelledRefundedOrders
                );

                setText(
                    "purchasedAmount",
                    money(result.purchasedCents)
                );

                setText(
                    "cancelledRefundedAmount",
                    money(result.cancelledRefundedCents)
                );

                setText(
                    "grandTotal",
                    money(result.grandTotalCents)
                );

                if (statusMessage) {
                    statusMessage.textContent =
                        `Cálculo concluído: ${result.totalOrders} pedidos encontrados.`;
                }
            }
        );
    } catch (error) {
        console.error("Erro inesperado:", error);

        btn.textContent = "Calcular Gastos";
        btn.disabled = false;

        if (statusMessage) {
            statusMessage.textContent =
                "Erro inesperado ao calcular os gastos. Tente novamente.";

            statusMessage.classList.add("visible");
        }
    }
});


function calculateShopeeTotal() {
    let purchasedCents = 0;
    let cancelledRefundedCents = 0;
    let grandTotalCents = 0;

    let purchasedOrders = 0;
    let cancelledRefundedOrders = 0;

    const unclassifiedOrders = [];
    const allOrders = [];

    const processedOrders = new Set();
    const statusSummary = {};

    const allElements = Array.from(
        document.querySelectorAll("div, span, label")
    );

    function parseBrazilianMoney(value) {
        if (!value) return null;

        let text = String(value)
            .replace(/\s/g, "")
            .replace("R$", "");

        if (text.includes(",")) {
            text = text
                .replace(/\./g, "")
                .replace(",", ".");
        }

        const number = Number(text);

        if (!Number.isFinite(number) || number < 0) {
            return null;
        }

        return Math.round(number * 100);
    }

    function registerStatus(status, cents, category) {
        if (!statusSummary[status]) {
            statusSummary[status] = {
                status,
                quantidade: 0,
                valorCentavos: 0,
                comprados: 0,
                canceladosOuReembolsados: 0,
                naoClassificados: 0
            };
        }

        const summary = statusSummary[status];

        summary.quantidade++;
        summary.valorCentavos += cents;

        if (category === "COMPRADO") {
            summary.comprados++;
        } else if (category === "CANCELADO/REEMBOLSADO") {
            summary.canceladosOuReembolsados++;
        } else {
            summary.naoClassificados++;
        }
    }

    const totalLabels = allElements.filter(element => {
        const text = (element.innerText || "").trim().toUpperCase();

        return (
            text === "TOTAL DO PEDIDO:" ||
            text === "TOTAL DO PEDIDO"
        );
    });

    totalLabels.forEach((label, index) => {
        let valueElement = null;
        let parent = label.parentElement;

        for (let level = 0; level < 6 && parent; level++) {
            const candidates = Array.from(
                parent.querySelectorAll(
                    '[aria-label*="Total do Pedido"], .YSXMiC'
                )
            );

            for (const candidate of candidates) {
                const candidateText =
                    (candidate.innerText || "").trim();

                if (/R\$\s*[\d.]+,\d{2}/.test(candidateText)) {
                    valueElement = candidate;
                    break;
                }
            }

            if (valueElement) break;

            const children = Array.from(
                parent.querySelectorAll("*")
            );

            for (const child of children) {
                const childText =
                    (child.innerText || "").trim();

                if (/R\$\s*[\d.]+,\d{2}/.test(childText)) {
                    valueElement = child;
                    break;
                }
            }

            if (valueElement) break;

            parent = parent.parentElement;
        }

        if (!valueElement) {
            const parentText =
                label.parentElement?.innerText || "";

            const match = parentText.match(
                /R\$\s*([\d.]+,\d{2})/
            );

            if (match) {
                valueElement = {
                    innerText: "R$ " + match[1]
                };
            }
        }

        if (!valueElement) {
            return;
        }

        const valueText = valueElement.innerText || "";

        const priceMatch = valueText.match(
            /R\$\s*([\d.]+,\d{2})/
        );

        if (!priceMatch) {
            return;
        }

        const priceCents = parseBrazilianMoney(priceMatch[1]);

        if (priceCents === null) {
            return;
        }

        parent = label.parentElement;

        let orderCard = null;

        for (let level = 0; level < 25 && parent; level++) {
            const parentText = (parent.innerText || "")
                .trim()
                .toUpperCase();

            const hasTotal =
                parentText.includes("TOTAL DO PEDIDO");

            const hasOrderStructure =
                parentText.includes(
                    "SEÇÃO DA LISTA DE ITENS NO PEDIDO"
                ) ||
                parentText.includes(
                    "ÁREA DOS BOTÕES DE AÇÃO"
                ) ||
                parentText.includes(
                    "SEÇÃO DE LOJA DO PEDIDO"
                );

            if (hasTotal && hasOrderStructure) {
                orderCard = parent;
                break;
            }

            parent = parent.parentElement;
        }

        if (!orderCard) {
            orderCard = label.parentElement;
        }

        if (!orderCard || processedOrders.has(orderCard)) {
            return;
        }

        processedOrders.add(orderCard);

        const cardText = (orderCard.innerText || "")
            .trim()
            .toUpperCase();

        let detectedStatus = null;

        if (cardText.includes("CANCELADO")) {
            detectedStatus = "CANCELADO";
        } else if (cardText.includes("REEMBOLSADO")) {
            detectedStatus = "REEMBOLSADO";
        } else if (cardText.includes("DEVOLVIDO")) {
            detectedStatus = "DEVOLVIDO";
        } else if (cardText.includes("REEMBOLSO")) {
            detectedStatus = "REEMBOLSO";
        } else if (cardText.includes("PREPARANDO")) {
            detectedStatus = "PREPARANDO";
        } else if (cardText.includes("A CAMINHO")) {
            detectedStatus = "A CAMINHO";
        } else if (cardText.includes("AVALIADO")) {
            detectedStatus = "AVALIADO";
        } else if (cardText.includes("PEDIDO RECEBIDO")) {
            detectedStatus = "PEDIDO RECEBIDO";
        } else if (cardText.includes("ENTREGUE")) {
            detectedStatus = "ENTREGUE";
        } else if (cardText.includes("FINALIZADO")) {
            detectedStatus = "FINALIZADO";
        }

        const isCancelledOrRefunded =
            detectedStatus === "CANCELADO" ||
            detectedStatus === "REEMBOLSADO" ||
            detectedStatus === "DEVOLVIDO" ||
            detectedStatus === "REEMBOLSO" ||
            cardText.includes("REEMBOLSO") ||
            cardText.includes("REEMBOLSADO");

        const purchasedStatuses = [
            "AVALIADO",
            "PREPARANDO",
            "A CAMINHO",
            "FINALIZADO",
            "ENTREGUE",
            "PEDIDO RECEBIDO"
        ];

        let category;

        if (isCancelledOrRefunded) {
            category = "CANCELADO/REEMBOLSADO";
        } else if (purchasedStatuses.includes(detectedStatus)) {
            category = "COMPRADO";
        } else {
            category = "NÃO CLASSIFICADO";
        }

        const order = {
            index: index + 1,
            value: priceCents / 100,
            status: detectedStatus || "STATUS NÃO IDENTIFICADO",
            category
        };

        allOrders.push(order);

        grandTotalCents += priceCents;

        registerStatus(
            order.status,
            priceCents,
            category
        );

        if (category === "COMPRADO") {
            purchasedCents += priceCents;
            purchasedOrders++;
        } else if (category === "CANCELADO/REEMBOLSADO") {
            cancelledRefundedCents += priceCents;
            cancelledRefundedOrders++;
        } else {
            unclassifiedOrders.push(order);
        }
    });

    const statusSummaryArray = Object.values(statusSummary)
        .map(item => ({
            status: item.status,
            quantidade: item.quantidade,
            valor: item.valorCentavos / 100,
            comprados: item.comprados,
            canceladosOuReembolsados:
                item.canceladosOuReembolsados,
            naoClassificados: item.naoClassificados
        }))
        .sort((a, b) => b.quantidade - a.quantidade);

    return {
        totalOrders: processedOrders.size,
        purchasedOrders,
        cancelledRefundedOrders,
        purchasedCents,
        cancelledRefundedCents,
        grandTotalCents,
        orders: allOrders,
        statusSummary: statusSummaryArray,
        unclassifiedOrders
    };
}