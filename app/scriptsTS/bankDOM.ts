class Bank {
    clients: clientsBankDOM[];
    bills: billsClientsDOM[];

    constructor() {
        this.clients = clients;
        this.bills = bills;
        this.setClientsToLocalStorage(this.clients);
        this.setCardsToLocalStorage(this.bills);
        this.choiseCurrency();
        this.editClient();
    }

    setClientsToLocalStorage(data: clientsBankDOM[]) {
        data = data || this.clients;
        localStorage.clients = JSON.stringify(data);
    }

    getClientsFromLocalStorage() {
        const arrayClients = localStorage.clients;
        return JSON.parse(arrayClients || null);
    }

    setCardsToLocalStorage(data: billsClientsDOM[]) {
        data = data || this.bills;
        localStorage.bills = JSON.stringify(data);
    }

    getCardsFromLocalStorage() {
        const arrayBills = localStorage.bills;
        return JSON.parse(arrayBills || null);
    }

    deleteClient(id: string) {
        const clients: clientsBankDOM[] = this.getClientsFromLocalStorage();
        const updatedClients: clientsBankDOM[] = clients.map(item => {
            if (item.id === Number(id)) {
                item.isActive = false;
            }
            return item;
        })
        this.setClientsToLocalStorage(updatedClients);
        new Clients();
    }

    deleteCard(numberCard: string, billClient: number) {
        const cards: billsClientsDOM[] = this.getCardsFromLocalStorage();
        const clients: clientsBankDOM[] = this.getClientsFromLocalStorage();
        const updatedCards = cards.map(item => {
            if (item.bill === billClient) {
                item.cards.find(data => {
                    if (data.numberCard === Number(numberCard)) {
                        data.isActive = false;
                    }
                })
            }
            return item;
        })
        this.setCardsToLocalStorage(updatedCards);
        clients.find(item => {
            if (item.bill === billClient) {
                new ModalInfoClient().createModal(item);
            }
        })
    }

    editClient() {
        const editClient = document.querySelector('.add') as HTMLElement;
        editClient.addEventListener('click', (event) => {
            event.preventDefault();
            new ModalAddDataClient().createEditForm();
        })
    }

    choiseCurrency() {
        const inputChoiceFirst = document.querySelector('.choiceFirst') as HTMLInputElement;
        inputChoiceFirst.addEventListener("change", (event) => {
            event.preventDefault();
            const result = this.getSumAllMoneyBank(inputChoiceFirst.value);
            return result;
        });

        const inputChoiceSecond = document.querySelector('.choiceSecond') as HTMLInputElement;
        inputChoiceSecond.addEventListener("change", (event) => {
            event.preventDefault();
            const result = this.getSumAllDebtAccounts(inputChoiceSecond.value);
            return result;
        });

        const inputAmount = document.querySelector('.amount') as HTMLInputElement;
        inputAmount.addEventListener("change", (event) => {
            event.preventDefault();
            const data: boolean = true;
            if (inputAmount.value === 'active') {
                this.getAmountDebtorAndAllSumDebt(data);
            } else {
                this.getAmountDebtorAndAllSumDebt(!data);
            }
            return inputAmount.value;
        });
    }

    getAmountDebtorAndAllSumDebt(isActive: boolean): { [key: number]: number } {
        let sumAllDebt: number = 0;
        let countDebtor: number = 0;
        let result: {} = {};

        const clientsArray: clientsBankDOM[] = this.getClientsFromLocalStorage();
        const billsArray: billsClientsDOM[] = this.getCardsFromLocalStorage();
        const resultAmountClient = document.querySelector('.resultAmountClient') as HTMLElement;
        const resultSumClient = document.querySelector('.resultSumClient') as HTMLElement;

        for (let item of clientsArray) {
            if (item.isActive === isActive) {
                let bill = item.bill;

                for (let data of billsArray) {
                    if (data.bill === bill) {

                        for (let card of data.cards) {
                            if (card.viewCard === 'credit') {
                                countDebtor++;
                                sumAllDebt += card.limit - card.funds;
                            }
                        }
                    }
                }
            }
        }
        resultAmountClient.innerText = String(countDebtor);
        resultSumClient.innerText = String(sumAllDebt);
        result = {
            [countDebtor]: sumAllDebt,
        };

        return result;
    }

    async getCurrentRates() {
        let coefficientArray = [];

        for await (let settings of this.serverRequest()) {
            coefficientArray = settings;
        }

        return coefficientArray;
    }

    async *serverRequest() {
        yield fetch('https://api.privatbank.ua/p24api/pubinfo?json&exchange&coursid=5')
            .then(response => response.json());
    }

    async getCurrentCoefficient(currency: string) {
        // debugger
        let coefficientArray = await this.getCurrentRates();
        let coefficient: number = 0;

        for (let rates of coefficientArray) {
            if (rates.ccy === currency) {
                coefficient = Number(rates.buy);
                break;
            }
        }

        return coefficient;
    }

    async getSumAllMoneyBank(currency: string) {
        // debugger
        let sumMoneyInHryvnia: number = 0;
        let sumAllMoneyClient: number = 0;

        const billsArray = this.getCardsFromLocalStorage();
        const resultAllSum = document.querySelector('.resultAllSum') as HTMLElement;

        for (let bill of billsArray) {
            for (let card of bill.cards) {

                if (card.currency === 'UAH') {
                    sumMoneyInHryvnia += card.personalFunds + card.funds;
                } else {
                    sumAllMoneyClient = card.personalFunds + card.funds;
                    sumMoneyInHryvnia += sumAllMoneyClient * await this.getCurrentCoefficient(card.currency);
                }
            }
        }
        resultAllSum.innerText = (sumMoneyInHryvnia / await this.getCurrentCoefficient(currency)).toFixed(2);

        return resultAllSum;
    }

    async getSumAllDebtAccounts(currency: string) {
        let sumDebtInHryvnia: number = 0;
        let sumDebtClient: number = 0;

        const billsArray = this.getCardsFromLocalStorage();
        const resultArrears = document.querySelector('.resultArrears') as HTMLElement;

        for (let bill of billsArray) {
            for (let card of bill.cards) {
                if (card.currency === 'UAH') {
                    sumDebtInHryvnia += card.limit - card.funds;
                } else {
                    sumDebtClient = card.limit - card.funds;
                    sumDebtInHryvnia += sumDebtClient * await this.getCurrentCoefficient(card.currency);
                }
            }
        }
        resultArrears.innerText = (sumDebtInHryvnia / await this.getCurrentCoefficient(currency)).toFixed(2);

        return resultArrears;
    }

}

const bank = new Bank();

class Clients {
    block: HTMLElement;

    constructor() {
        this.block = document.querySelector('.blockClients') as HTMLElement;
        this.renderCardClient();
    }

    createCardDataClient(item: clientsBankDOM): HTMLElement {
        const card = document.createElement('DIV') as HTMLElement;
        card.className = 'card';
        card.onclick = () => new ModalInfoClient().createModal(item);

        const titleCard = document.createElement('SPAN') as HTMLSpanElement;
        titleCard.className = 'clientFIO';
        titleCard.innerText = `${item.surname} ${item.name} ${item.patronymic}`;

        const registration = document.createElement('SPAN') as HTMLSpanElement;
        registration.innerText = `Дата регистрации : ${item.registration}`;

        const status = document.createElement('SPAN') as HTMLSpanElement;
        status.innerText = `Текущий статус : ${item.isActive}`;

        const blockButton = document.createElement('DIV') as HTMLElement;

        const editClient = document.createElement('BUTTON') as HTMLButtonElement;
        editClient.name = String(item.id);
        editClient.innerText = 'Edit';

        editClient.addEventListener("click", event => {
            event.stopPropagation();
            const elementDOM: HTMLButtonElement = event.target as HTMLButtonElement;
            console.log('element: ', elementDOM)
            const arrayClients: clientsBankDOM[] = bank.getClientsFromLocalStorage();
            const client = arrayClients.find(item => {
                if (String(item.id) === elementDOM.name) {
                    return item;
                }
            })
            console.log('client: ', client)
            new ModalAddDataClient().createEditForm(client);
        });

        const deleteClient = document.createElement('BUTTON') as HTMLButtonElement;
        if (item.isActive) {
            deleteClient.disabled = false;
        } else {
            deleteClient.disabled = true;
        }
        deleteClient.innerText = 'Delete';
        deleteClient.name = String(item.id);

        deleteClient.addEventListener("click", event => {
            event.stopPropagation();
            bank.deleteClient(deleteClient.name);
        });

        blockButton.append(editClient, deleteClient);
        card.append(titleCard, registration, status, blockButton);

        return card;
    }

    renderCardClient() {
        this.block.innerHTML = '';
        const arrayClients: clientsBankDOM[] = bank.getClientsFromLocalStorage();
        const cards = arrayClients.map(item => this.createCardDataClient(item));
        this.block.append(...cards);
    }

}

const list = new Clients();

class Cards {

    createCardDataCards(item: cardsClientsDOM, billClient: number) {

        const card = document.createElement('DIV') as HTMLElement;
        card.className = 'cardInfo';

        const bill = document.createElement('SPAN') as HTMLSpanElement;
        bill.innerText = `Счёт: ${item.viewCard}`;

        const numberCard = document.createElement('SPAN') as HTMLSpanElement;
        numberCard.innerText = `Номер карты: ${item.numberCard}`;

        const personalBalance = document.createElement('SPAN') as HTMLSpanElement;
        personalBalance.innerText = `Личный баланс: ${item.personalFunds}`;

        const creditBalance = document.createElement('SPAN') as HTMLSpanElement;
        creditBalance.innerText = `Кредитный баланс: ${item.funds}`;

        const creditLimit = document.createElement('SPAN') as HTMLSpanElement;
        creditLimit.innerText = `Кредитный лимит: ${item.limit}`;

        const currency = document.createElement('SPAN') as HTMLSpanElement;
        currency.innerText = `Валюта счета: ${item.currency}`;

        const status = document.createElement('SPAN') as HTMLSpanElement;
        status.innerText = `Текущий статус: ${item.isActive}`;

        const validCard = document.createElement('SPAN') as HTMLSpanElement;
        validCard.innerText = `Выдана до: ${item.expiryDate}`;

        const blockButton = document.createElement('DIV') as HTMLElement;

        const editCard = document.createElement('BUTTON') as HTMLButtonElement;
        editCard.name = String(item.numberCard);
        editCard.innerText = 'Edit';

        editCard.addEventListener("click", event => {
            event.preventDefault();
            new ModalAddDataCard().createEditForm(billClient, item);
        });

        const deleteCard = document.createElement('BUTTON') as HTMLButtonElement;
        deleteCard.innerText = 'Delete';
        if (item.isActive) {
            deleteCard.disabled = false;
        } else {
            deleteCard.disabled = true;
        }

        deleteCard.name = String(item.numberCard);
        deleteCard.addEventListener("click", event => {
            event.preventDefault();
            bank.deleteCard(deleteCard.name, billClient);
        });

        blockButton.append(editCard, deleteCard);
        card.append(
            bill,
            numberCard,
            personalBalance,
            creditBalance,
            creditLimit,
            currency,
            status,
            validCard,
            blockButton);

        return card;
    }

}

const listCards = new Cards();

class ModalInfoClient {
    modal: HTMLElement;
    modalContainer: HTMLElement;
    constructor() {
        this.modal = document.querySelector('.modalInfo') as HTMLElement;
        this.modalContainer = document.querySelector('.modalContainer') as HTMLElement;
    }

    createModal(data: clientsBankDOM) {
        this.modalContainer.innerHTML = '';
        this.modal.classList.add('active');

        const clientInfo = document.createElement('DIV') as HTMLElement;
        clientInfo.className = 'clientInfo';

        const titleCard = document.createElement('SPAN') as HTMLSpanElement;
        titleCard.className = 'clientFIO';
        titleCard.innerText = `${data.surname} ${data.name} ${data.patronymic}`;

        const bill = document.createElement('DIV') as HTMLElement;
        bill.className = 'bill';
        bill.innerText = `Счет: ${data.bill}`;

        const registration = document.createElement('SPAN') as HTMLSpanElement;
        registration.innerText = `Дата регистрации : ${data.registration}`;

        const status = document.createElement('SPAN') as HTMLSpanElement;
        status.innerText = `Текущий статус : ${data.isActive}`;

        clientInfo.append(titleCard, bill, registration, status);

        const addNewCardClient = document.createElement('BUTTON') as HTMLButtonElement;
        addNewCardClient.className = 'add';
        addNewCardClient.addEventListener('click', (event) => {
            event.preventDefault();
            new ModalAddDataCard().createEditForm(data.bill);
        })


        const cardsInfo = document.createElement('DIV') as HTMLElement;
        cardsInfo.className = 'blockCards';
        cardsInfo.innerHTML = '';
        const arrayCards: billsClientsDOM[] = bank.getCardsFromLocalStorage();

        arrayCards.find(item => {
            if (item.bill === data.bill) {
                item.cards.map(element => cardsInfo.appendChild(listCards.createCardDataCards(element, data.bill)));
            }
        })

        this.modalContainer.append(clientInfo, addNewCardClient, cardsInfo);
        this.modal.onclick = (event) => {
            if (this.modal !== event.target) return;
            this.modal.classList.remove('active');
        }
    }

}

class ModalAddDataClient {
    modal: HTMLElement;
    modalContainer: HTMLElement;
    constructor() {
        this.modal = document.querySelector('.EditClient') as HTMLElement;
        this.modalContainer = document.querySelector('.modalContainerEditClient') as HTMLElement;
    }

    createEditForm(client?: clientsBankDOM) {
        // debugger
        console.log('create client: ', client)
        this.modalContainer.innerHTML = '';
        client = client || null;
        console.log('null', client)
        this.modal.classList.add('active');

        const form = document.createElement('FORM') as HTMLFormElement;
        form.id = 'addClient';

        const inputId = document.createElement('INPUT') as HTMLInputElement;
        inputId.type = 'number';
        inputId.className = 'idClient';
        inputId.name = 'id';
        inputId.value = client ? String(client.id) : '';

        const spanSurname = document.createElement('SPAN') as HTMLSpanElement;
        spanSurname.innerText = 'Фамилия: ';
        const surname = document.createElement('INPUT') as HTMLInputElement;
        surname.setAttribute('required', 'true');
        surname.type = 'text';
        surname.name = 'surname';
        surname.value = client ? client.surname : '';

        const spanName = document.createElement('SPAN') as HTMLSpanElement;
        spanName.innerText = 'Имя: ';
        const name = document.createElement('INPUT') as HTMLInputElement;
        name.setAttribute('required', 'true');
        name.type = 'text';
        name.name = 'name';
        name.value = client ? client.name : '';

        const spanPatronymic = document.createElement('SPAN') as HTMLSpanElement;
        spanPatronymic.innerText = 'Отчество: ';
        const patronymic = document.createElement('INPUT') as HTMLInputElement;
        patronymic.setAttribute('required', 'true');
        patronymic.type = 'text';
        patronymic.name = 'patronymic';
        patronymic.value = client ? client.patronymic : '';

        const spanIsActive = document.createElement('SPAN') as HTMLSpanElement;
        spanIsActive.innerText = 'Текущий статус: ';
        const isActive = document.createElement('INPUT') as HTMLInputElement;
        isActive.setAttribute('required', 'true');
        isActive.type = 'text';
        isActive.name = 'isActive';
        isActive.value = client ? String(client.isActive) : '';

        const spanRegistration = document.createElement('SPAN') as HTMLSpanElement;
        spanRegistration.innerText = 'Дата регистрации: ';
        const registration = document.createElement('INPUT') as HTMLInputElement;
        registration.setAttribute('required', 'true');
        registration.type = 'date';
        registration.name = 'registration';
        registration.value = client ? client.registration : '';

        const spanBill = document.createElement('SPAN') as HTMLSpanElement;
        spanBill.innerText = 'Лицевой счет: ';
        const bill = document.createElement('INPUT') as HTMLInputElement;
        bill.setAttribute('required', 'true');
        bill.type = 'number';
        bill.name = 'bill';
        bill.value = client ? String(client.bill) : '';

        const saveClient = document.createElement('INPUT') as HTMLInputElement;
        saveClient.type = 'submit';
        saveClient.value = 'Save';
        saveClient.className = 'button';

        form.append(
            inputId,
            spanSurname,
            surname,
            spanName,
            name,
            spanPatronymic,
            patronymic,
            spanIsActive,
            isActive,
            spanRegistration,
            registration,
            spanBill,
            bill,
            saveClient
        );

        form.onsubmit = (event) => {
            event.preventDefault();
            let formData = new FormData(form);
            let arrayClients: clientsBankDOM[] = bank.getClientsFromLocalStorage();

            if (client !== null) {
                arrayClients = arrayClients.map(item => {

                    if (item.id === Number(formData.get('id'))) {
                        item.name = String(formData.get('name'));
                        item.surname = String(formData.get('surname'));
                        item.patronymic = String(formData.get('patronymic'));
                        item.isActive = Boolean(formData.get('isActive'));
                        item.registration = String(formData.get('registration'));
                        item.bill = Number(formData.get('bill'));
                    }

                    return item;
                })
                bank.setClientsToLocalStorage(arrayClients);
            } else {
                const newIdClient: number = ++arrayClients.length;
                const newClient: clientsBankDOM = {
                    id: newIdClient,
                    name: String(formData.get('name')),
                    surname: String(formData.get('surname')),
                    patronymic: String(formData.get('patronymic')),
                    isActive: true,
                    registration: String(formData.get('registration')),
                    bill: Number(formData.get('bill')),
                };
                arrayClients.push(newClient);
                bank.setClientsToLocalStorage(arrayClients);
            }
            this.modal.classList.remove('active');
            new Clients();
        }
        this.modalContainer.appendChild(form);

        const cancel = document.createElement('button') as HTMLButtonElement;
        cancel.innerText = 'Cancel';
        cancel.className = 'button';
        cancel.onclick = () => this.modal.classList.remove('active');

        this.modal.onclick = (event) => {
            if (this.modal !== event.target) return;
            this.modal.classList.remove('active');
        }
        this.modalContainer.append(cancel);
    }

}

class ModalAddDataCard {
    modal: HTMLElement;
    modalContainer: HTMLElement;
    constructor() {
        this.modal = document.querySelector('.EditCard');
        this.modalContainer = document.querySelector('.modalContainerEditCard');
    }

    createEditForm(billClient: number, card?: cardsClientsDOM) {
        this.modalContainer.innerHTML = '';
        card = card || null;
        this.modal.classList.add('active');

        const form = document.createElement('FORM') as HTMLFormElement;
        form.id = 'addCard';

        const spanViewCard = document.createElement('SPAN') as HTMLSpanElement;
        spanViewCard.innerText = 'Cчет: ';
        const viewCard = document.createElement('INPUT') as HTMLInputElement;
        viewCard.setAttribute('list', 'viewCard');
        viewCard.setAttribute('required', 'true');
        viewCard.name = 'viewCard';
        viewCard.value = card ? card.viewCard : '';

        const datalistViewCard = document.createElement('DATALIST') as HTMLDataListElement;
        datalistViewCard.id = 'viewCard';
        datalistViewCard.innerHTML = `
            <option>debit</option>
            <option>credit</option>
        `

        const spanNumberCard = document.createElement('SPAN') as HTMLSpanElement;
        spanNumberCard.innerText = 'Номер карты: ';
        const numberCard = document.createElement('INPUT') as HTMLInputElement;
        numberCard.type = 'number';
        numberCard.setAttribute('required', 'true');
        numberCard.name = 'numberCard';
        numberCard.value = card ? String(card.numberCard) : '';

        const spanPersonalFunds = document.createElement('SPAN') as HTMLSpanElement;
        spanPersonalFunds.innerText = 'Личный баланс: ';
        const personalFunds = document.createElement('INPUT') as HTMLInputElement;
        personalFunds.type = 'number';
        personalFunds.setAttribute('required', 'true');
        personalFunds.name = 'personalFunds';
        personalFunds.value = card ? String(card.personalFunds) : '';

        const spanFunds = document.createElement('SPAN') as HTMLSpanElement;
        spanFunds.innerText = 'Кредитный баланс: ';
        const funds = document.createElement('INPUT') as HTMLInputElement;
        funds.type = 'number';
        funds.setAttribute('required', 'true');
        funds.name = 'funds';
        funds.value = card ? String(card.funds) : '0';

        const spanLimit = document.createElement('SPAN') as HTMLSpanElement;
        spanLimit.innerText = 'Кредитный лимит: ';
        const limit = document.createElement('INPUT') as HTMLInputElement;
        limit.type = 'number';
        limit.setAttribute('required', 'true');
        limit.name = 'limit';
        limit.value = card ? String(card.limit) : '0';

        const spanCurrency = document.createElement('SPAN') as HTMLSpanElement;
        spanCurrency.innerText = 'Валюта счета';
        const currency = document.createElement('INPUT') as HTMLInputElement;
        currency.setAttribute('list', 'currency');
        currency.setAttribute('required', 'true');
        currency.name = 'currency';
        currency.value = card ? card.currency : '';

        const datalistCurrency = document.createElement('DATALIST') as HTMLDataListElement;
        datalistCurrency.id = 'currency';
        datalistCurrency.innerHTML = `
            <option>USD</option>
            <option>UAH</option>
            <option>RUR</option>
            <option>EUR</option>
        `

        const spanIsActive = document.createElement('SPAN') as HTMLSpanElement;
        spanIsActive.innerText = 'Текущий статус активен? ';
        const isActive = document.createElement('INPUT') as HTMLInputElement;
        isActive.setAttribute('list', 'isActive');
        isActive.setAttribute('required', 'true');
        isActive.name = 'isActive';
        isActive.value = card ? String(card.isActive) : '';

        const datalistIsActive = document.createElement('DATALIST') as HTMLDataListElement;
        datalistIsActive.id = 'isActive';
        datalistIsActive.innerHTML = `
            <option>false</option>
            <option>true</option>
        `

        const spanExpiryDate = document.createElement('SPAN') as HTMLSpanElement;
        spanExpiryDate.innerText = 'Выдана до: ';
        const expiryDate = document.createElement('INPUT') as HTMLInputElement;
        expiryDate.type = 'date';
        expiryDate.setAttribute('required', 'true');
        expiryDate.name = 'expiryDate';
        expiryDate.value = card ? card.expiryDate : '';

        const saveCard = document.createElement('INPUT') as HTMLInputElement;
        saveCard.type = 'submit';
        saveCard.value = 'Save';
        saveCard.className = 'button';

        form.append(
            spanViewCard,
            viewCard,
            datalistViewCard,
            spanNumberCard,
            numberCard,
            spanPersonalFunds,
            personalFunds,
            spanFunds,
            funds,
            spanLimit,
            limit,
            spanCurrency,
            currency,
            datalistCurrency,
            spanIsActive,
            isActive,
            datalistIsActive,
            spanExpiryDate,
            expiryDate,
            saveCard
        );

        form.onsubmit = (event) => {
            event.preventDefault();
            let formData = new FormData(form);
            let arrayBills: billsClientsDOM[] = bank.getCardsFromLocalStorage();

            arrayBills = arrayBills.map(item => {
                if (item.bill === billClient) {
                    if (card !== null) {
                        item.cards = item.cards.map(data => {
                            if (data.numberCard === Number(formData.get('numberCard'))) {
                                data.viewCard = String(formData.get('viewCard'));
                                data.numberCard = Number(formData.get('numberCard'));
                                data.personalFunds = Number(formData.get('personalFunds'));
                                data.funds = Number(formData.get('funds'));
                                data.limit = Number(formData.get('limit'));
                                data.expiryDate = String(formData.get('expiryDate'));
                                data.isActive = Boolean(formData.get('isActive'));
                                data.currency = String(formData.get('currency'));
                            }

                            return data;
                        })
                    } else {
                        const newCard: cardsClientsDOM = {
                            viewCard: String(formData.get('viewCard')),
                            numberCard: Number(formData.get('numberCard')),
                            personalFunds: Number(formData.get('personalFunds')),
                            funds: Number(formData.get('funds')),
                            limit: Number(formData.get('limit')),
                            expiryDate: String(formData.get('expiryDate')),
                            isActive: Boolean(formData.get('isActive')),
                            currency: String(formData.get('currency')),
                        };
                        item.cards.push(newCard);
                    }
                }
                return item;
            })
            bank.setCardsToLocalStorage(arrayBills);

            this.modal.classList.remove('active');
            const client: clientsBankDOM = bank.getClientsFromLocalStorage().find(item => item.bill === billClient);
            new ModalInfoClient().createModal(client);
        }

        this.modalContainer.appendChild(form);

        const cancel = document.createElement('BUTTON') as HTMLButtonElement;
        cancel.innerText = 'Cancel';
        cancel.className = 'button';
        cancel.onclick = () => this.modal.classList.remove('active');
        this.modal.onclick = (event) => {
            if (this.modal !== event.target) return;
            this.modal.classList.remove('active');
        }
        this.modalContainer.append(cancel);
    }

}