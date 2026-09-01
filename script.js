// ============================================================
// TAKA GO - FINANCIAL NET BALANCE DASHBOARD
// ============================================================

function renderAdminNetBalanceDashboard() {

    const users = safeJSONParse(
        localStorage.getItem("takago_users"),
        []
    );

    const balanceRequests = safeJSONParse(
        localStorage.getItem("takago_balance_requests"),
        []
    );

    const transferRequestsNew = safeJSONParse(
        localStorage.getItem("takago_transfer_requests"),
        []
    );

    // --------------------------------------------------------
    // TOTALS
    // --------------------------------------------------------

    let receivable = 0;
    let totalDue = 0;
    let expenses = 0;

    // --------------------------------------------------------
    // BALANCE REQUESTS
    // --------------------------------------------------------

    balanceRequests.forEach(function (req) {

        const amount = parseFloat(req.amount || 0);

        if (!Number.isFinite(amount) || amount <= 0) {
            return;
        }

        const type = String(
            req.type ||
            req.paymentType ||
            ""
        )
            .toLowerCase()
            .trim();

        const status = String(
            req.status || ""
        )
            .toLowerCase()
            .trim();

        // Only approved/completed transactions
        if (
            status !== "approved" &&
            status !== "completed" &&
            status !== "paid"
        ) {
            return;
        }

        // ----------------------------------------------------
        // PAID / ADD
        // ----------------------------------------------------

        if (
            type === "paid" ||
            type === "deposit" ||
            type === "add"
        ) {
            receivable += amount;
        }

        // ----------------------------------------------------
        // DUE
        // ----------------------------------------------------

        if (type === "due") {
            totalDue += amount;
        }
    });

    // --------------------------------------------------------
    // USER DUE DATA
    //
    // Important:
    // Do NOT add user.dues.paid to receivable here.
    // Otherwise one payment can be counted twice.
    // --------------------------------------------------------

    let userDueAdded = 0;
    let userDuePaid = 0;

    users.forEach(function (user) {

        if (!user || !user.dues) {
            return;
        }

        const dueAmount = parseFloat(
            user.dues.amount || 0
        );

        const paidAmount = parseFloat(
            user.dues.paid || 0
        );

        if (Number.isFinite(dueAmount) && dueAmount > 0) {
            userDueAdded += dueAmount;
        }

        if (Number.isFinite(paidAmount) && paidAmount > 0) {
            userDuePaid += paidAmount;
        }
    });

    // --------------------------------------------------------
    // DUE CALCULATION
    // --------------------------------------------------------

    // If user.dues.amount exists, use it as the main
    // outstanding due source.
    //
    // balanceRequests "DUE" is also supported.
    // We use the larger calculated amount to prevent
    // duplicate counting of the same due.
    // --------------------------------------------------------

    const requestDueRemaining =
        Math.max(
            0,
            totalDue
        );

    const userDueRemaining =
        Math.max(
            0,
            userDueAdded - userDuePaid
        );

    totalDue =
        Math.max(
            requestDueRemaining,
            userDueRemaining
        );

    // --------------------------------------------------------
    // TRANSFER / CUSTOMER EXPENSES
    // --------------------------------------------------------

    transferRequestsNew.forEach(function (request) {

        const status = String(
            request.status || ""
        )
            .toLowerCase()
            .trim();

        if (
            status === "pending" ||
            status === "completed" ||
            status === "approved"
        ) {

            const amount = parseFloat(
                request.bdtAmount ||
                request.bdt ||
                request.amount ||
                0
            );

            if (
                Number.isFinite(amount) &&
                amount > 0
            ) {
                expenses += amount;
            }
        }
    });

    // --------------------------------------------------------
    // NET BALANCE
    // --------------------------------------------------------

    let net =
        receivable +
        totalDue -
        expenses;

    if (!Number.isFinite(net)) {
        net = 0;
    }

    if (net < 0) {
        net = 0;
    }

    // --------------------------------------------------------
    // GET DASHBOARD ELEMENTS
    // --------------------------------------------------------

    const receivableEl =
        document.getElementById(
            "stat-receivable"
        ) ||
        document.getElementById(
            "total-pabo"
        );

    const dueEl =
        document.getElementById(
            "stat-total-due"
        ) ||
        document.getElementById(
            "total-pabe"
        );

    const netEl =
        document.getElementById(
            "stat-net-balance"
        ) ||
        document.getElementById(
            "net-balance"
        );

    // --------------------------------------------------------
    // FORMAT MONEY
    // --------------------------------------------------------

    function formatMoney(value) {

        const number =
            Number.isFinite(Number(value))
                ? Number(value)
                : 0;

        return (
            "৳ " +
            number.toLocaleString(
                "en-IN",
                {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }
            )
        );
    }

    // --------------------------------------------------------
    // UPDATE DASHBOARD
    // --------------------------------------------------------

    if (receivableEl) {

        receivableEl.innerText =
            formatMoney(receivable);
    }

    if (dueEl) {

        dueEl.innerText =
            formatMoney(totalDue);
    }

    if (netEl) {

        netEl.innerText =
            formatMoney(net);
    }
}


// ============================================================
// CUSTOMER BALANCES & DUE STATEMENT DASHBOARD
// ============================================================

function renderCustomerDueDashboard() {

    const tbody =
        document.getElementById(
            "customer-due-table-body"
        ) ||
        document.getElementById(
            "admin-balance-table-body"
        );

    if (!tbody) {
        return;
    }

    const users = safeJSONParse(
        localStorage.getItem("takago_users"),
        []
    );

    tbody.innerHTML = "";

    if (
        !Array.isArray(users) ||
        users.length === 0
    ) {

        tbody.innerHTML = `
            <tr>
                <td
                    colspan="7"
                    style="
                        text-align:center;
                        color:#94a3b8;
                        padding:15px;
                    "
                >
                    No customer records found.
                </td>
            </tr>
        `;

        return;
    }

    // --------------------------------------------------------
    // RENDER EACH USER
    // --------------------------------------------------------

    users.forEach(function (user) {

        if (!user) {
            return;
        }

        // ----------------------------------------------------
        // WALLET BALANCE
        // ----------------------------------------------------

        let wallet = 0;

        // New wallet system
        if (
            user.walletBalances &&
            typeof user.walletBalances === "object"
        ) {

            const methods = [
                "bkash",
                "nagad",
                "bank",
                "recharge",
                "rocket",
                "other"
            ];

            methods.forEach(function (method) {

                const value =
                    parseFloat(
                        user.walletBalances[method] || 0
                    );

                if (
                    Number.isFinite(value)
                ) {
                    wallet += value;
                }
            });

        } else {

            // Old wallet system
            wallet = parseFloat(
                user.bdtBalance ||
                user.balance ||
                0
            );

            if (!Number.isFinite(wallet)) {
                wallet = 0;
            }
        }

        // ----------------------------------------------------
        // DUE
        // ----------------------------------------------------

        let totalDue = 0;
        let paid = 0;

        if (
            user.dues &&
            typeof user.dues === "object"
        ) {

            totalDue = parseFloat(
                user.dues.amount || 0
            );

            paid = parseFloat(
                user.dues.paid || 0
            );
        }

        if (!Number.isFinite(totalDue)) {
            totalDue = 0;
        }

        if (!Number.isFinite(paid)) {
            paid = 0;
        }

        // ----------------------------------------------------
        // REMAINING DUE
        // ----------------------------------------------------

        let remaining =
            totalDue - paid;

        if (!Number.isFinite(remaining)) {
            remaining = 0;
        }

        if (remaining < 0) {
            remaining = 0;
        }

        // ----------------------------------------------------
        // ROLE
        // ----------------------------------------------------

        const role =
            String(
                user.role || "user"
            ).toUpperCase();

        // ----------------------------------------------------
        // USER NAME
        // ----------------------------------------------------

        const userName =
            user.name ||
            user.username ||
            "N/A";

        const username =
            user.username ||
            "";

        // ----------------------------------------------------
        // STATUS
        // ----------------------------------------------------

        let statusHTML = "";

        if (remaining > 0) {

            statusHTML = `
                <span
                    class="badge"
                    style="
                        background:#ef4444;
                        color:#fff;
                        padding:4px 9px;
                        border-radius:12px;
                        font-size:11px;
                        font-weight:700;
                        display:inline-block;
                    "
                >
                    DUE: ৳${remaining.toFixed(2)}
                </span>
            `;

        } else {

            statusHTML = `
                <span
                    class="badge"
                    style="
                        background:#10b981;
                        color:#fff;
                        padding:4px 9px;
                        border-radius:12px;
                        font-size:11px;
                        font-weight:700;
                        display:inline-block;
                    "
                >
                    NO DUE
                </span>
            `;
        }

        // ----------------------------------------------------
        // CREATE ROW
        // ----------------------------------------------------

        const tr =
            document.createElement("tr");

        tr.innerHTML = `

            <td>

                <strong>
                    ${userName}
                </strong>

                <br>

                <small
                    style="
                        color:#64748b;
                    "
                >
                    @${username}
                </small>

            </td>


            <td>

                <span
                    class="badge"
                    style="
                        background:#6b7280;
                        color:#fff;
                        padding:4px 9px;
                        border-radius:12px;
                        font-size:11px;
                        font-weight:700;
                    "
                >
                    ${role}
                </span>

            </td>


            <td>
                ৳ ${wallet.toFixed(2)}
            </td>


            <td>
                ৳ ${totalDue.toFixed(2)}
            </td>


            <td>
                ৳ ${paid.toFixed(2)}
            </td>


            <td>
                ৳ ${remaining.toFixed(2)}
            </td>


            <td>
                ${statusHTML}
            </td>

        `;

        tbody.appendChild(tr);
    });
}


// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        // ----------------------------------------------------
        // TRANSFER REQUESTS
        // ----------------------------------------------------

        if (
            typeof getStoredRequests ===
            "function"
        ) {

            transferRequests =
                getStoredRequests();
        }

        // ----------------------------------------------------
        // EXISTING FUNCTIONS
        // ----------------------------------------------------

        if (
            typeof changeCountryRate ===
            "function"
        ) {

            changeCountryRate();
        }

        if (
            typeof renderRequests ===
            "function"
        ) {

            renderRequests();
        }

        if (
            typeof renderAdminTransactionInventory ===
            "function"
        ) {

            renderAdminTransactionInventory();
        }

        if (
            typeof updatePersonalAccountSummary ===
            "function"
        ) {

            updatePersonalAccountSummary();
        }

        // ----------------------------------------------------
        // FINANCIAL DASHBOARD
        // ----------------------------------------------------

        renderAdminNetBalanceDashboard();

        renderCustomerDueDashboard();

        // ----------------------------------------------------
        // PAYMENT METHOD
        // ----------------------------------------------------

        if (
            typeof handlePaymentMethodChange ===
            "function"
        ) {

            handlePaymentMethodChange();
        }

        // ----------------------------------------------------
        // NAVBAR
        // ----------------------------------------------------

        if (
            typeof renderNavbarByRole ===
            "function"
        ) {

            renderNavbarByRole();
        }
    }
);


// ============================================================
// AUTO REFRESH
// ============================================================

setInterval(
    function () {

        if (
            typeof renderAdminNetBalanceDashboard ===
            "function"
        ) {

            renderAdminNetBalanceDashboard();
        }

        if (
            typeof renderCustomerDueDashboard ===
            "function"
        ) {

            renderCustomerDueDashboard();
        }

        if (
            typeof updatePersonalAccountSummary ===
            "function"
        ) {

            updatePersonalAccountSummary();
        }

        if (
            typeof renderNavbarByRole ===
            "function"
        ) {

            renderNavbarByRole();
        }

    },
    1000
);